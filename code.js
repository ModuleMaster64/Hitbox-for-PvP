(async function () {
    const gameScript = [...document.scripts].find(s => s.src.includes("/assets/index"))?.src;
    if (!gameScript) return;

    const response = await fetch(gameScript);
    const gameCode = await response.text();

    const script = document.createElement("script");
    script.type = "module";
    script.textContent = `
        ${gameCode}

        // === Transparent Hitboxes Injection ===
        (() => {
            const maxBoxes = 20;
            let hitboxesEnabled = false;
            let Mesh, EntityPlayer, Vector3, boxGeometry, scene;
            const boxMeshes = [];

            const hookInterval = setInterval(() => {
                try {
                    for (const key in window) {
                        const val = window[key];
                        if (val?.prototype?.set && val?.prototype?.getX && !Vector3) Vector3 = val;
                        if (val?.prototype?.material && val?.prototype?.geometry && !Mesh) Mesh = val;
                        if (val?.prototype?.isSpectator !== undefined && val?.prototype?.setGamemode && !EntityPlayer) EntityPlayer = val;
                        if (typeof val === "function" && val.toString().includes("1,2,1") && !boxGeometry) boxGeometry = val;
                    }

                    const game = window.game;
                    if (Mesh && Vector3 && EntityPlayer && boxGeometry && game?.gameScene?.ambientMeshes) {
                        scene = game.gameScene.ambientMeshes;
                        clearInterval(hookInterval);
                        initializeHitboxes();
                        console.log('[Hitbox] Ready - press L to toggle');
                    }
                } catch {}
            }, 500);

            function initializeHitboxes() {
                for (let i = 0; i < maxBoxes; i++) {
                    const mesh = new Mesh(new boxGeometry(1, 2, 1));
                    Object.assign(mesh.material, {
                        depthTest: false,
                        transparent: true,
                        opacity: 0.15,
                        color: { setRGB: (r, g, b) => mesh.material.color.setRGB(r, g, b) }
                    });
                    mesh.material.color.setRGB(1, 1, 1);
                    mesh.renderOrder = 10;
                    mesh.visible = false;
                    scene.add(mesh);
                    boxMeshes.push(mesh);
                }

                window.addEventListener("keydown", (e) => {
                    if (e.key.toLowerCase() === "l") {
                        hitboxesEnabled = !hitboxesEnabled;
                        console.log("[Hitbox] Toggled:", hitboxesEnabled);
                        if (!hitboxesEnabled) boxMeshes.forEach(mesh => mesh.visible = false);
                    }
                });

                const draw = () => {
                    requestAnimationFrame(draw);
                    if (!hitboxesEnabled || !window.game?.world?.entitiesDump) return;

                    const entities = [...window.game.world.entitiesDump.values()];
                    let index = 0;

                    for (const entity of entities) {
                        if (!(entity instanceof EntityPlayer) || entity.id === window.game.player?.id) continue;

                        const mesh = boxMeshes[index];
                        if (!mesh || !entity.mesh?.position) continue;

                        mesh.position.set(entity.mesh.position.x, entity.mesh.position.y + 1, entity.mesh.position.z);
                        mesh.visible = true;
                        index++;
                        if (index >= maxBoxes) break;
                    }

                    while (index < maxBoxes) {
                        boxMeshes[index++].visible = false;
                    }
                };

                requestAnimationFrame(draw);
            }
        })();
    `;
    document.head.appendChild(script);
})();
