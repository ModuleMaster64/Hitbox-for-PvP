(async function () {
    const gameSrc = [...document.scripts].find(s => s.src.includes("/assets/index"))?.src;
    if (!gameSrc) return;

    const response = await fetch(gameSrc);
    const gameCode = await response.text();

    const script = document.createElement("script");
    script.type = "module";
    script.textContent = `
        ${gameCode};

        // === Transparent Hitboxes Injected Code ===
        (function () {
            let hitboxesEnabled = false;
            let Mesh, EntityPlayer, Vector3, boxGeometry, scene;
            let boxMeshes = [];
            const maxBoxes = 20;

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
                    if (Mesh && Vector3 && EntityPlayer && game && boxGeometry) {
                        scene = game.gameScene.ambientMeshes;
                        if (!scene) return;
                        clearInterval(hookInterval);
                        setup();
                        console.log('[Hitbox] Ready - press L to toggle');
                    }
                } catch (e) {}
            }, 500);

            function setup() {
                for (let i = 0; i < maxBoxes; i++) {
                    const mesh = new Mesh(new boxGeometry(1, 2, 1));
                    mesh.material.depthTest = false;
                    mesh.material.transparent = true;
                    mesh.material.opacity = 0.15;
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
                        if (!hitboxesEnabled) boxMeshes.forEach(b => b.visible = false);
                    }
                });

                requestAnimationFrame(function draw() {
                    requestAnimationFrame(draw);
                    if (!hitboxesEnabled || !game?.world?.entitiesDump) return;

                    const entities = [...game.world.entitiesDump.values()];
                    let index = 0;

                    for (const entity of entities) {
                        if (!(entity instanceof EntityPlayer)) continue;
                        if (entity.id === game.player?.id) continue;

                        const mesh = boxMeshes[index];
                        if (!mesh || !entity.mesh?.position) continue;

                        mesh.position.set(entity.mesh.position.x, entity.mesh.position.y + 1, entity.mesh.position.z);
                        mesh.visible = true;
                        index++;
                        if (index >= maxBoxes) break;
                    }

                    for (; index < maxBoxes; index++) boxMeshes[index].visible = false;
                });
            }
        })();
    `;
    document.head.appendChild(script);
})();
