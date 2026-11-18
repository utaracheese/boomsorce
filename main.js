// KHỞI TẠO MÔ HÌNH GAME, HỆ THỐNG CAMERA THU PHÓNG VÀ VÒNG LẶP CHÍNH
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.imageSmoothingEnabled = false;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const WORLD_WIDTH = 3500;
const WORLD_HEIGHT = 3500;

// === HỆ THỐNG BACKGROUND 4 GÓC RANDOM ===
const bgImages = [1, 2, 3, 4].map(num => {
    const img = new Image();
    img.src = `assets/bgr/bgr${num}.png`;
    return img;
});
let randomizedMapSlots = [];

function randomizeBackground() {
    randomizedMapSlots = [...bgImages].sort(() => Math.random() - 0.5);
}
randomizeBackground();

// === HỆ THỐNG QUẢN LÝ TẢI VÀ CHẠY FRAME HOẠT ẢNH PIXEL ===
const animCache = {};

function getAnimFrames(folderPath, maxFrames = 25) {
    if (animCache[folderPath]) return animCache[folderPath];

    const frameList = [];
    animCache[folderPath] = {
        frames: frameList,
        maxValid: -1
    };

    for (let i = 1; i <= maxFrames; i++) {
        const pad3 = String(i).padStart(3, '0');
        const img = new Image();

        if (folderPath.includes('IceSpear')) {
            img.src = `assets/Frames/${folderPath}/VFX 1 Repeatable${i}.png`;
        } else if (folderPath.includes('IceShoot')) {
            img.src = `assets/Frames/${folderPath}/VFX 1 Hit${i}.png`;
        } else if (folderPath === 'Slashes/Green/Slash3') {
            img.src = `assets/Frames/Slashes/Green/Slash3_color1_frame${i}.png`;
        } else if (folderPath === 'Slashes/Green/Slash') {
            img.src = `assets/Frames/Slashes/Green/Slash_color1_frame${i}.png`;
        } else if (folderPath === 'Slashes/Green/Slash2') {
            img.src = `assets/Frames/Slashes/Green/Slash2_color1_frame${i}.png`;
        } else if (folderPath === 'Fire/Green') {
            img.src = `assets/Frames/Fire/Green/Group 4 - 1_${i}.png`;
        } else if (folderPath === 'Bats/Fly') {
            img.src = `assets/Frames/Bats/Fly/Bat_Fly_${i - 1}.png`;
        } else if (folderPath === 'Bats/Hit') {
            img.src = `assets/Frames/Bats/Hit/hit bat${i - 1}.png`;
        } else {
            img.src = `assets/Frames/${folderPath}/frame${pad3}.png`;
        }

        img._idx = i - 1;
        img._loaded = false;
        img._failed = false;

        img.onload = () => { img._loaded = true; };
        img.onerror = () => {
            img._failed = true;
            if (animCache[folderPath].maxValid === -1 || img._idx < animCache[folderPath].maxValid) {
                animCache[folderPath].maxValid = img._idx;
            }
        };
        frameList.push(img);
    }
    return animCache[folderPath];
}
window.getAnimFrames = getAnimFrames;

function getValidFrames(folderPath) {
    const data = getAnimFrames(folderPath);
    const valid = [];
    const limit = data.maxValid !== -1 ? data.maxValid : data.frames.length;
    for (let i = 0; i < limit; i++) {
        const img = data.frames[i];
        if (img && (img._loaded || (img.complete && img.naturalWidth > 0))) {
            valid.push(img);
        } else {
            break;
        }
    }
    return valid;
}
window.getValidFrames = getValidFrames;

class AnimatedEffect {
    constructor(folderPath, x, y, options = {}) {
        this.folderPath = folderPath;
        this.x = x;
        this.y = y;
        this.scale = options.scale || 1.0;
        this.targetSize = options.targetSize || null;
        this.fps = options.fps || 20;
        this.rotation = options.rotation !== undefined ? options.rotation : (Math.random() * Math.PI * 2);
        this.originX = options.originX !== undefined ? options.originX : 0.5;
        this.originY = options.originY !== undefined ? options.originY : 0.5;
        this.followTarget = options.followTarget || null;
        this.offsetY = options.offsetY || 0;
        this.onFrame = options.onFrame || null;
        this.triggeredFrames = new Set();
        this.time = 0;
        this.dead = false;
        getAnimFrames(folderPath);
        this.loop = options.loop || false;
    }

    update(dt) {
        this.time += dt;

        if (this.followTarget) {
            if (this.followTarget.dead) {
                this.dead = true;
                return;
            }
            this.x = this.followTarget.x;
            this.y = this.followTarget.y + this.offsetY;
        }

        const valid = getValidFrames(this.folderPath);
        if (valid.length > 0) {
            let frameIdx = Math.floor(this.time * this.fps);

            if (this.loop) {
                frameIdx = frameIdx % valid.length;
            }

            if (this.onFrame && !this.triggeredFrames.has(frameIdx)) {
                this.triggeredFrames.add(frameIdx);
                this.onFrame(frameIdx + 1);
            }

            if (!this.loop && frameIdx >= valid.length) {
                this.dead = true;
            }
        } else {
            if (this.time > 0.8) this.dead = true;
        }
    }

    draw(ctx) {
        const valid = getValidFrames(this.folderPath);
        if (valid.length === 0) return;
        let frameIdx = Math.floor(this.time * this.fps);
        if (this.loop) {
            frameIdx = frameIdx % valid.length;
        } else if (frameIdx >= valid.length) {
            return;
        }

        const img = valid[frameIdx];
        if (!img || !img.naturalWidth) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        let scale = this.scale;
        if (this.targetSize && img.naturalWidth > 0) {
            scale = this.targetSize / img.naturalWidth;
        }
        const w = img.naturalWidth * scale;
        const h = img.naturalHeight * scale;

        ctx.drawImage(img, -w * this.originX, -h * this.originY, w, h);
        ctx.restore();
    }
}

function spawnAnimatedEffect(folderPath, x, y, options = {}) {
    const fx = new AnimatedEffect(folderPath, x, y, options);
    gameState.animatedEffects.push(fx);
    return fx;
}
window.spawnAnimatedEffect = spawnAnimatedEffect;

const critIconImg = new Image();
critIconImg.src = "assets/crit.png";
critIconImg.onerror = () => {
    critIconImg.src = "assets/icon/crit.png";
};

let selectedHeroP1 = 'rivent';
let selectedHeroP2 = 'rivent';

function pickHero(pId, heroType) {
    if (pId === 1) {
        selectedHeroP1 = heroType;
        document.querySelectorAll('#trackP1 .hero-pick-card').forEach(c => c.classList.remove('selected'));
        let target = document.getElementById(`p1-hero-${heroType}`);
        if (target) target.classList.add('selected');
    } else {
        selectedHeroP2 = heroType;
        document.querySelectorAll('#trackP2 .hero-pick-card').forEach(c => c.classList.remove('selected'));
        let target = document.getElementById(`p2-hero-${heroType}`);
        if (target) target.classList.add('selected');
    }
}
window.pickHero = pickHero;

function setLobbyGameMode(mode) {
    let modeInput = document.getElementById("gameModeSelect");
    if (modeInput) modeInput.value = mode;

    let btnSurv = document.getElementById("btnModeSurvival");
    let btnPrac = document.getElementById("btnModePractice");

    if (btnSurv) btnSurv.classList.toggle('active', mode === 'survival');
    if (btnPrac) btnPrac.classList.toggle('active', mode === 'practice');
}
window.setLobbyGameMode = setLobbyGameMode;

function onLobbyStartGame() {
    let lobby = document.getElementById("selectScreen");
    if (lobby) lobby.style.display = "none";
    let hud = document.getElementById("hud");
    if (hud) hud.style.display = "block";
    initSurvivalMatch();
}
window.onLobbyStartGame = onLobbyStartGame;

const gameState = {
    active: false,
    isPracticeMode: false,
    practiceSpawnMonsters: false,
    practiceFreezeMonsters: false,
    dummy: null,
    players: [],
    enemies: [],
    projectiles: [],
    magaSlashes: [],
    animatedEffects: [],
    damageTexts: [],
    particles: [],
    keys: {},
    mouse: { x: 0, y: 0, worldX: 0, worldY: 0, isDown: false },
    activeShopPlayer: null,
    activeCardPlayer: null,
    shopTab: 'ad',
    selectedShopItem: null
};

window.addEventListener('keydown', e => {
    gameState.keys[e.key.toLowerCase()] = true;
    gameState.keys[e.code] = true;

    if (e.key === 'q' || e.key === 'Q') toggleShop(1);
    if (e.key === 'p' || e.key === 'P') toggleShop(2);

    if (gameState.active) {
        if (e.key === 'f' || e.key === 'F') {
            let p1 = gameState.players[0];
            if (p1 && !p1.dead && p1.heroType === 'magadot' && window.mapProps) {
                let nearChest = window.mapProps.props.find(pr => pr.def.isChest && !pr.dead && Math.hypot(pr.x - p1.x, pr.y - p1.y) <= 75);
                if (nearChest) p1.interactChest();
            }
        }
        if (e.key === 'l' || e.key === 'L' || e.key === '5' || e.code === 'Numpad5') {
            let p2 = gameState.players[1];
            if (p2 && !p2.dead && p2.heroType === 'magadot' && window.mapProps) {
                let nearChest = window.mapProps.props.find(pr => pr.def.isChest && !pr.dead && Math.hypot(pr.x - p2.x, pr.y - p2.y) <= 75);
                if (nearChest) p2.interactChest();
            }
        }
    }

    // XỬ LÝ CHIÊU P1 (E, R, T)
    if (gameState.active && gameState.players[0]) {
        let p1 = gameState.players[0];
        let aim = Math.atan2(gameState.mouse.worldY - p1.y, gameState.mouse.worldX - p1.x);
        
        if (e.key === 'e' || e.key === 'E') {
            if (typeof hookOnCastSkillItems === 'function') hookOnCastSkillItems(p1); // <-- Thêm ở đây
            if (p1.heroType === 'gorox') p1.castSkill1();
            else p1.castSkill1(aim);
        }
        if (e.key === 'r' || e.key === 'R') {
            if (typeof hookOnCastSkillItems === 'function') hookOnCastSkillItems(p1); // <-- Thêm ở đây
            if (p1.heroType === 'wirdor' || p1.heroType === 'magadot') p1.castSkill2(aim);
            else p1.castSkill2();
        }
        if (e.key === 't' || e.key === 'T') {
            if (typeof hookOnCastSkillItems === 'function') hookOnCastSkillItems(p1); // <-- Thêm ở đây
            p1.castSkill3(aim);
        }
    }

    // XỬ LÝ CHIÊU P2 (1, 2, 3)
    if (gameState.active && gameState.players[1]) {
        let p2 = gameState.players[1];
        let nearest = getNearestMonster(p2);
        let aim = nearest ? Math.atan2(nearest.y - p2.y, nearest.x - p2.x) : p2.angle;
        
        if (e.key === '1') {
            if (typeof hookOnCastSkillItems === 'function') hookOnCastSkillItems(p2); // <-- Thêm ở đây
            if (p2.heroType === 'gorox') p2.castSkill1();
            else p2.castSkill1(aim);
        }
        if (e.key === '2') {
            if (typeof hookOnCastSkillItems === 'function') hookOnCastSkillItems(p2); // <-- Thêm ở đây
            if (p2.heroType === 'wirdor' || p2.heroType === 'magadot') p2.castSkill2(aim);
            else p2.castSkill2();
        }
        if (e.key === '3') {
            if (typeof hookOnCastSkillItems === 'function') hookOnCastSkillItems(p2); // <-- Thêm ở đây
            p2.castSkill3(aim);
        }
    }
});

window.addEventListener('keyup', e => {
    gameState.keys[e.key.toLowerCase()] = false;
    gameState.keys[e.code] = false;
});

canvas.addEventListener('mousemove', e => {
    gameState.mouse.x = e.clientX;
    gameState.mouse.y = e.clientY;
});

canvas.addEventListener('mousedown', e => {
    if (e.button === 0) {
        gameState.mouse.isDown = true;
    }
});

window.addEventListener('mouseup', e => {
    if (e.button === 0) {
        gameState.mouse.isDown = false;
    }
});

const camera = {
    x: 0, 
    y: 0,
    zoom: 1.0,
    targetZoom: 1.0,
    update() {
        let activePlayers = gameState.players.filter(p => !p.dead);
        if (activePlayers.length === 0) return;

        let avgX, avgY;
        if (activePlayers.length === 1) {
            avgX = activePlayers[0].x;
            avgY = activePlayers[0].y;
            this.targetZoom = 1.0;
        } else {
            let p1 = activePlayers[0];
            let p2 = activePlayers[1];
            avgX = (p1.x + p2.x) / 2;
            avgY = (p1.y + p2.y) / 2;

            let dx = Math.abs(p1.x - p2.x);
            let dy = Math.abs(p1.y - p2.y);

            let paddingX = 280;
            let paddingY = 220;
            let requiredZoomX = canvas.width / (dx + paddingX * 2);
            let requiredZoomY = canvas.height / (dy + paddingY * 2);

            let calculatedZoom = Math.min(requiredZoomX, requiredZoomY);
            this.targetZoom = Math.max(0.52, Math.min(1.0, calculatedZoom));
        }

        this.zoom += (this.targetZoom - this.zoom) * 0.08;

        let targetX = avgX - (canvas.width / 2) / this.zoom;
        let targetY = avgY - (canvas.height / 2) / this.zoom;

        this.x += (targetX - this.x) * 0.1;
        this.y += (targetY - this.y) * 0.1;

        let viewW = canvas.width / this.zoom;
        let viewH = canvas.height / this.zoom;
        this.x = Math.max(0, Math.min(WORLD_WIDTH - viewW, this.x));
        this.y = Math.max(0, Math.min(WORLD_HEIGHT - viewH, this.y));
    }
};

function createImpactParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
        let angle = Math.random() * Math.PI * 2;
        let speed = 2 + Math.random() * 4;
        gameState.particles.push({
            x: x, y: y,
            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            size: 2 + Math.random() * 3,
            color: color,
            alpha: 1.0,
            life: 0.3 + Math.random() * 0.2
        });
    }
}

function createShockwave(x, y, color, maxRadius) {
    gameState.particles.push({
        type: 'shockwave',
        x: x, y: y,
        radius: 5,
        maxRadius: maxRadius,
        color: color,
        alpha: 0.9,
        life: 0.35,
        maxLife: 0.35
    });
}

function createLevelUpParticles(x, y, color) {
    for (let i = 0; i < 25; i++) {
        let a = Math.random() * Math.PI * 2;
        let spd = 2 + Math.random() * 5;
        gameState.particles.push({
            x: x, y: y,
            vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
            size: 3.5,
            color: color,
            alpha: 1.0,
            life: 0.6
        });
    }
}

class Projectile {
    constructor(cfg) {
        this.owner = cfg.owner;
        this.attackType = cfg.attackType || 'basic_attack';
        this.x = cfg.x; this.y = cfg.y;
        this.vx = cfg.vx; this.vy = cfg.vy;
        this.radius = cfg.radius; this.speed = cfg.speed;
        this.damage = cfg.damage; this.dmgType = cfg.dmgType;
        this.color = cfg.color; this.range = cfg.range;
        this.isCrit = cfg.isCrit || false;
        this.isFourthShot = cfg.isFourthShot || false;
        this.isBonusBullet = cfg.isBonusBullet || false;
        this.hasSplash = cfg.hasSplash || false;
        this.splashRatio = cfg.splashRatio || 0;
        this.piercing = cfg.piercing || false;
        this.noLifesteal = cfg.noLifesteal || false;
        this.onHitExtra = cfg.onHitExtra || null;

        this.spriteFolder = cfg.spriteFolder || null;
        this.spriteScale = cfg.spriteScale || 1.0;
        this.spriteFps = cfg.spriteFps || 20;
        this.hitEffect = cfg.hitEffect || null;
        this.hitEffectScale = cfg.hitEffectScale || 1.15;
        this.animTime = 0;

        this.dist = 0;
        this.dead = false;
        this.hitEntities = [];

        if (this.spriteFolder) getAnimFrames(this.spriteFolder);
        if (this.hitEffect) getAnimFrames(this.hitEffect);
    }

    update(dt) {
        this.animTime += dt;
        let dx = this.vx * this.speed * dt * 60;
        let dy = this.vy * this.speed * dt * 60;
        this.x += dx; this.y += dy;
        this.dist += Math.hypot(dx, dy);
        if (this.dist >= this.range) this.dead = true;

        for (let enemy of gameState.enemies) {
            if (this.dead) break;
            if (!this.hitEntities.includes(enemy) && Math.hypot(this.x - enemy.x, this.y - enemy.y) <= (this.radius + enemy.radius)) {
                this.hitEntities.push(enemy);

                let dmgSource = this.noLifesteal ? 'skill' : this.attackType;
                enemy.takeDamage(this.damage, this.dmgType, this.owner, this.isCrit, dmgSource);
                if (this.onHitExtra) this.onHitExtra(enemy);

                if (this.hitEffect) {
                    let hitScale = (this.hitEffectScale || 1.2) * (1 + (this.radius - 5) * 0.04);
                    spawnAnimatedEffect(this.hitEffect, enemy.x, enemy.y, {
                        scale: hitScale,
                        fps: 24,
                        rotation: Math.random() * Math.PI * 2
                    });
                }

                processItemOnHitPassives(this.owner, enemy, this);

                if (this.hasSplash) {
                    let splashDmg = this.damage * this.splashRatio;
                    let splashRadius = 120;
                    
                    spawnAnimatedEffect('Explosions/Shockwave', this.x, this.y, { 
                        scale: (splashRadius / 50) * 1.35,
                        fps: 24 
                    });

                    gameState.enemies.forEach(sub => {
                        if (sub !== enemy && Math.hypot(sub.x - this.x, sub.y - this.y) <= splashRadius) {
                            sub.takeDamage(splashDmg, this.dmgType, this.owner, false, 'basic_attack');
                        }
                    });
                }

                if (!this.piercing) {
                    this.dead = true;
                    break;
                }
            }
        }
    }

    draw(ctx) {
        let drawnSprite = false;

        if (this.spriteFolder) {
            const valid = getValidFrames(this.spriteFolder);
            if (valid.length > 0) {
                const frameIdx = Math.floor(this.animTime * this.spriteFps) % valid.length;
                const img = valid[frameIdx];
                if (img && img.naturalWidth > 0) {
                    const angle = Math.atan2(this.vy, this.vx);
                    ctx.save();
                    ctx.translate(this.x, this.y);
                    ctx.rotate(angle);
                    const w = img.naturalWidth * this.spriteScale;
                    const h = img.naturalHeight * this.spriteScale;
                    ctx.drawImage(img, -w / 2, -h / 2, w, h);
                    ctx.restore();
                    drawnSprite = true;
                }
            }
        }

        if (!drawnSprite) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = this.isFourthShot ? 14 : 7;
            ctx.fill();
            ctx.restore();
        }
    }
}

function getNearestMonster(p) {
    let nearest = null;
    let minDist = Infinity;
    gameState.enemies.forEach(e => {
        if (e.monsterType === 'dummy' && e.isInvisible) return;
        if (e.dead) return;

        let d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < minDist) { minDist = d; nearest = e; }
    });
    return nearest;
}

function spawnHeroInstance(heroType, id, x, y, startGold) {
    if (heroType === 'magadot' && typeof Magadot === 'function') return new Magadot(id, x, y, { startingGold: startGold });
    if (heroType === 'taking' && typeof Taking === 'function') return new Taking(id, x, y, { startingGold: startGold });
    if (heroType === 'wirdor') return new Wirdor(id, x, y, { startingGold: startGold });
    if (heroType === 'gorox') return new Gorox(id, x, y, { startingGold: startGold });
    return new Rivent(id, x, y, { startingGold: startGold });
}

function initSurvivalMatch() {
    let startGoldInput = document.getElementById("startGoldInput");
    let startGoldVal = startGoldInput ? parseInt(startGoldInput.value, 10) : 500;
    if (isNaN(startGoldVal) || startGoldVal < 0) startGoldVal = 500;

    let startTimeInput = document.getElementById("startTimeInput");
    let startTimeVal = startTimeInput ? parseFloat(startTimeInput.value) : 0;
    if (isNaN(startTimeVal) || startTimeVal < 0) startTimeVal = 0;

    matchTimer = startTimeVal;
    window.matchTimer = matchTimer;
    spawnTimer = 0;
    gameState.firstBossSpawned = false;
    gameState.bossRespawnTimer = 0;

    gameState.active = true;
    randomizeBackground();
    let modeSelect = document.getElementById("gameModeSelect");
    gameState.isPracticeMode = (modeSelect && modeSelect.value === 'practice');
    gameState.practiceSpawnMonsters = false;
    gameState.practiceFreezeMonsters = false;
    let freezeBtn = document.getElementById("btnToggleFreezeMonsters");
    if (freezeBtn) {
        freezeBtn.classList.remove('active');
        freezeBtn.innerText = "❄️ Băng Hà Quái: TẮT";
    }

    let p1 = spawnHeroInstance(selectedHeroP1, 1, WORLD_WIDTH / 2 - 120, WORLD_HEIGHT / 2, startGoldVal);
    let p2 = spawnHeroInstance(selectedHeroP2, 2, WORLD_WIDTH / 2 - 120, WORLD_HEIGHT / 2 + 80, startGoldVal);

    gameState.players = [p1, p2];
    gameState.enemies = [];
    gameState.projectiles = [];
    gameState.magaSlashes = [];
    gameState.animatedEffects = [];
    gameState.damageTexts = [];
    gameState.particles = [];

    let practiceBtn = document.getElementById("practiceSettingBtn");
    if (gameState.isPracticeMode) {
        if (practiceBtn) practiceBtn.style.display = 'block';
        if (typeof DummyMonster === 'function') {
            gameState.dummy = new DummyMonster(WORLD_WIDTH / 2 + 100, WORLD_HEIGHT / 2);
            gameState.enemies.push(gameState.dummy);
        }
    } else {
        if (practiceBtn) practiceBtn.style.display = 'none';
        gameState.dummy = null;
    }

    camera.x = WORLD_WIDTH / 2 - canvas.width / 2;
    camera.y = WORLD_HEIGHT / 2 - canvas.height / 2;

    if (window.mapProps) {
        window.mapProps.initWorldProps();
    }

    syncHUD();

    lastLoopTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function toggleRest(pId) {
    let p = gameState.players[pId - 1];
    if (!p) return;
    p.isResting = !p.isResting;
    let btn = document.getElementById(`p${pId}RestBtn`);
    if (btn) {
        btn.classList.toggle('locked', p.isResting);
        btn.innerText = p.isResting ? "🔒 Đang Nghỉ" : "🔓 Nghỉ";
    }
}
window.toggleRest = toggleRest;

let spawnTimer = 0;
let matchTimer = 0;

function spawnBossNearPlayers(waveLv) {
    let alivePlayers = gameState.players.filter(p => p && !p.dead);
    let p = alivePlayers.length > 0
        ? alivePlayers[Math.floor(Math.random() * alivePlayers.length)]
        : gameState.players[0];
    if (!p) return;

    let angle = Math.random() * Math.PI * 2;
    let dist = 700;
    let bx = Math.max(120, Math.min(WORLD_WIDTH - 120, p.x + Math.cos(angle) * dist));
    let by = Math.max(120, Math.min(WORLD_HEIGHT - 120, p.y + Math.sin(angle) * dist));

    let boss = new AncientGolemBoss(bx, by, waveLv);
    gameState.enemies.push(boss);
}

function updateSpawn(dt) {
    matchTimer += dt;
    window.matchTimer = matchTimer;
    if (gameState.isPracticeMode && !gameState.practiceSpawnMonsters) return;

    let waveLv = 1 + Math.floor(matchTimer / 30);

    // Quản lý Boss: xuất hiện phút thứ 1, chỉ 1 con duy nhất, chết chờ 1 phút sau spawn con mới
    let activeBoss = gameState.enemies.find(e => e.isBoss && !e.dead);
    if (!activeBoss) {
        if (!gameState.firstBossSpawned) {
            if (matchTimer >= 60) {
                spawnBossNearPlayers(waveLv);
                gameState.firstBossSpawned = true;
                gameState.bossRespawnTimer = 0;
            }
        } else {
            if (gameState.bossRespawnTimer > 0) {
                gameState.bossRespawnTimer -= dt;
                if (gameState.bossRespawnTimer <= 0) {
                    spawnBossNearPlayers(waveLv);
                }
            }
        }
    }

    spawnTimer -= dt;
    let maxEnemies = Math.min(200, 15 + Math.floor(matchTimer / 3.5));

    if (spawnTimer <= 0 && gameState.enemies.length < maxEnemies) {
        spawnTimer = 0.55;
        let p = gameState.players[Math.floor(Math.random() * gameState.players.length)];
        let angle = Math.random() * Math.PI * 2;
        let dist = 650 + Math.random() * 250;
        let spawnX = Math.max(100, Math.min(WORLD_WIDTH - 100, p.x + Math.cos(angle) * dist));
        let spawnY = Math.max(100, Math.min(WORLD_HEIGHT - 100, p.y + Math.sin(angle) * dist));

        let mon = null;
        let roll = Math.random();

        if (matchTimer <= 45) {
            if (roll < 0.55) mon = new ZombieMonster(spawnX, spawnY, waveLv);
            else if (roll < 0.85) mon = new ZombieKnightMonster(spawnX, spawnY, waveLv);
            else mon = new CrabMonster(spawnX, spawnY, waveLv);
        } else if (matchTimer <= 90) {
            if (roll < 0.40) mon = new ZombieMonster(spawnX, spawnY, waveLv);
            else if (roll < 0.70) mon = new ZombieKnightMonster(spawnX, spawnY, waveLv);
            else if (roll < 0.88) mon = new CrabMonster(spawnX, spawnY, waveLv);
            else mon = new MantisMonster(spawnX, spawnY, waveLv);
        } else {
            let kingCrabCount = gameState.enemies.filter(e => e.monsterType === 'kingcrab' && !e.dead).length;
            if (roll < 0.28) mon = new ZombieMonster(spawnX, spawnY, waveLv);
            else if (roll < 0.53) mon = new ZombieKnightMonster(spawnX, spawnY, waveLv);
            else if (roll < 0.68) mon = new WitchMonster(spawnX, spawnY, waveLv);
            else if (roll < 0.83) mon = new CrabMonster(spawnX, spawnY, waveLv);
            else if (roll < 0.95) mon = new MantisMonster(spawnX, spawnY, waveLv);
            else if (kingCrabCount < 2) mon = new KingCrabMonster(spawnX, spawnY, waveLv);
            else mon = new CrabMonster(spawnX, spawnY, waveLv);
        }

        if (mon) {
            if (window.mapProps && window.mapProps.bushes && window.mapProps.bushes.length > 0 && Math.random() < 0.10) {
                let bush = window.mapProps.bushes[Math.floor(Math.random() * window.mapProps.bushes.length)];
                if (bush) {
                    mon.x = bush.x + (Math.random() - 0.5) * 10;
                    mon.y = bush.y + (Math.random() - 0.5) * 10;
                    mon.isStalker = true;
                    mon.stalkerBush = bush;
                    mon.aiState = 'stalking';
                }
            }
            gameState.enemies.push(mon);
        }
    }
}

let lastLoopTime = 0;
function gameLoop(timestamp) {
    let dt = (timestamp - lastLoopTime) / 1000;
    lastLoopTime = timestamp;
    if (dt > 0.1) dt = 0.1;

    update(dt);
    draw();

    if (gameState.active) requestAnimationFrame(gameLoop);
}

function update(dt) {
    updateSpawn(dt);
    camera.update();

    // Cập nhật các kỹ năng chủ động định kỳ từ thẻ (Lazer Beam & 6 Nòng)
    if (typeof updateCardActiveSkills === 'function') {
        updateCardActiveSkills(dt);
    }

    gameState.mouse.worldX = camera.x + gameState.mouse.x / camera.zoom;
    gameState.mouse.worldY = camera.y + gameState.mouse.y / camera.zoom;

    if (window.mapProps) {
        window.mapProps.update(dt);
        gameState.players.forEach(p => window.mapProps.resolveEntityCollision(p));
        gameState.enemies.forEach(e => window.mapProps.resolveEntityCollision(e));
    }

    let p1 = gameState.players[0];
    if (p1 && !p1.dead && !p1.isResting && p1.stunTimer <= 0 && !p1.isDashing) {
        let mx = 0, my = 0;
        if (gameState.keys['w']) my -= 1;
        if (gameState.keys['s']) my += 1;
        if (gameState.keys['a']) { mx -= 1; p1.facingLeft = true; }
        if (gameState.keys['d']) { mx += 1; p1.facingLeft = false; }
        if (mx !== 0 || my !== 0) {
            let l = Math.hypot(mx, my);
            let spd = p1.getActualSpeed();
            p1.x += (mx / l) * spd;
            p1.y += (my / l) * spd;
        }
        p1.angle = Math.atan2(gameState.mouse.worldY - p1.y, gameState.mouse.worldX - p1.x);

        if (gameState.mouse.isDown) {
            p1.castBasicAttack(p1.angle);
        }
    }

    let p2 = gameState.players[1];
    if (p2 && !p2.dead && !p2.isResting && p2.stunTimer <= 0 && !p2.isDashing) {
        let mx = 0, my = 0;
        if (gameState.keys['arrowup']) my -= 1;
        if (gameState.keys['arrowdown']) my += 1;
        if (gameState.keys['arrowleft']) { mx -= 1; p2.facingLeft = true; }
        if (gameState.keys['arrowright']) { mx += 1; p2.facingLeft = false; }
        if (mx !== 0 || my !== 0) {
            let l = Math.hypot(mx, my);
            let spd = p2.getActualSpeed();
            p2.x += (mx / l) * spd;
            p2.y += (my / l) * spd;
        }
        let nearest = getNearestMonster(p2);
        if (nearest) p2.angle = Math.atan2(nearest.y - p2.y, nearest.x - p2.x);

        let isHoldingZero = gameState.keys['0'] || gameState.keys['numpad0'];
        if (isHoldingZero) {
            p2.castBasicAttack(p2.angle);
        }
    }

    gameState.players.forEach(p => {
        p.update(dt);
        if (p.autoBuildItemId && typeof processAutoBuild === 'function') {
            let changed = processAutoBuild(p);
            if (changed && gameState.activeShopPlayer === p.id) {
                let modal = document.getElementById("shopModal");
                if (modal && modal.style.display === "flex") {
                    renderShopModal();
                }
            }
        }
    });

    // Cập nhật quái và giảm thời gian đóng băng
    gameState.enemies.forEach(e => {
        if (gameState.practiceFreezeMonsters && e.monsterType !== 'dummy') {
            if (e.updateBurn) e.updateBurn(dt);
            if (e.armorShredTimer > 0) {
                e.armorShredTimer -= dt;
                if (e.armorShredTimer <= 0) e.armorShredVal = 0;
            }
            return;
        }
        if (e.freezeTimer && e.freezeTimer > 0) {
            e.freezeTimer -= dt;
        }
        e.update(dt);
    });
    gameState.enemies = gameState.enemies.filter(e => !e.dead);

    if (gameState.magaSlashes) {
        for (let i = gameState.magaSlashes.length - 1; i >= 0; i--) {
            let slash = gameState.magaSlashes[i];
            slash.update(dt);
            if (slash.dead) gameState.magaSlashes.splice(i, 1);
        }
    }

    for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
        let proj = gameState.projectiles[i];
        proj.update(dt);

        if (!proj.dead && window.mapProps && window.mapProps.checkProjectileCollision(proj)) {
            proj.dead = true;
        }

        if (proj.dead) gameState.projectiles.splice(i, 1);
    }

    for (let i = gameState.animatedEffects.length - 1; i >= 0; i--) {
        let fx = gameState.animatedEffects[i];
        fx.update(dt);
        if (fx.dead) gameState.animatedEffects.splice(i, 1);
    }

    for (let i = gameState.particles.length - 1; i >= 0; i--) {
        let pt = gameState.particles[i];
        pt.life -= dt;
        if (pt.type === 'shockwave') {
            pt.radius += (pt.maxRadius - pt.radius) * 12 * dt;
            pt.alpha = pt.life / pt.maxLife;
        } else if (pt.type === 'lightning_segment') {
            pt.alpha = pt.life / 0.15;
        } else {
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.alpha -= dt / (pt.life + 0.1);
        }
        if (pt.life <= 0 || pt.alpha <= 0) {
            gameState.particles.splice(i, 1);
        }
    }

    if (gameState.damageTexts.length > 25) {
        gameState.damageTexts = gameState.damageTexts.slice(-25);
    }
    for (let i = gameState.damageTexts.length - 1; i >= 0; i--) {
        let t = gameState.damageTexts[i];
        t.y -= 28 * dt;
        t.life -= dt;
        if (t.life <= 0) gameState.damageTexts.splice(i, 1);
    }

    syncHUD();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    const halfW = WORLD_WIDTH / 2;
    const halfH = WORLD_HEIGHT / 2;
    const mapCoords = [
        { x: 0, y: 0 },
        { x: halfW, y: 0 },
        { x: 0, y: halfH },
        { x: halfW, y: halfH }
    ];

    randomizedMapSlots.forEach((img, i) => {
        if (img && img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, mapCoords[i].x, mapCoords[i].y, halfW + 1, halfH + 1);
        }
    });

    if (window.mapProps) window.mapProps.drawShadows(ctx);
    if (window.mapProps) window.mapProps.drawProps(ctx);

    if (gameState.magaSlashes) {
        gameState.magaSlashes.forEach(slash => slash.draw(ctx));
    }

    gameState.particles.forEach(pt => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.alpha);
        if (pt.type === 'shockwave') {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
            ctx.strokeStyle = pt.color;
            ctx.lineWidth = 3;
            ctx.stroke();
        } else if (pt.type === 'lightning_segment') {
            ctx.beginPath();
            ctx.moveTo(pt.x1, pt.y1);
            ctx.lineTo(pt.x2, pt.y2);
            ctx.strokeStyle = pt.color;
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#f1c40f';
            ctx.shadowBlur = 8;
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
            ctx.fillStyle = pt.color;
            ctx.fill();
        }
        ctx.restore();
    });

    // Vẽ quái vật và khối băng lục giác nếu bị đóng băng
    gameState.enemies.forEach(e => {
        e.draw(ctx);
        if (typeof drawHexagonIceBlock === 'function') {
            drawHexagonIceBlock(ctx, e);
        }
        if (gameState.practiceFreezeMonsters && e.monsterType !== 'dummy' && !e.dead) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.radius + 4, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(0, 210, 255, 0.28)";
            ctx.fill();
            ctx.strokeStyle = "#00e5ff";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }
    });

    gameState.players.forEach(p => {
        ctx.save();
        if (window.mapProps && window.mapProps.isEntityInBush(p)) {
            ctx.globalAlpha = 0.55;
        }
        p.draw(ctx);
        ctx.restore();
    });
    gameState.projectiles.forEach(p => p.draw(ctx));

    gameState.animatedEffects.forEach(fx => fx.draw(ctx));

    gameState.damageTexts.forEach(t => {
        ctx.save();
        ctx.globalAlpha = Math.min(1.0, t.life * 1.5);
        if (t.isCrit) {
            let fontSize = 28;
            ctx.font = `italic bold ${fontSize}px Arial`;
            ctx.fillStyle = t.color;
            ctx.textAlign = "left";
            ctx.fillText(t.text, t.x, t.y);

            let iconSize = fontSize * 0.95;
            let textW = ctx.measureText(t.text).width;
            drawCritIcon(ctx, t.x + textW + 3, t.y - iconSize * 0.8, iconSize, t.color);
        } else {
            ctx.font = "bold 16px Arial";
            ctx.fillStyle = t.color;
            ctx.textAlign = "center";
            ctx.fillText(t.text, t.x, t.y);
        }
        ctx.restore();
    });

    ctx.restore();
}
function drawBossIndicatorArrow(ctx) {
    let boss = gameState.enemies.find(e => e.isBoss && !e.dead);
    if (!boss) return;

    let screenX = (boss.x - camera.x) * camera.zoom;
    let screenY = (boss.y - camera.y) * camera.zoom;

    let cx = canvas.width / 2;
    let cy = canvas.height / 2;
    let dx = screenX - cx;
    let dy = screenY - cy;
    let angle = Math.atan2(dy, dx);

    let marginX = 48;
    let marginTop = 105;
    let marginBottom = 48;
    let halfW = cx - marginX;
    let halfHTop = cy - marginTop;
    let halfHBot = cy - marginBottom;

    let cos = Math.cos(angle);
    let sin = Math.sin(angle);
    let tX = cos !== 0 ? (halfW / Math.abs(cos)) : Infinity;
    let tY = sin < 0 ? (halfHTop / Math.abs(sin)) : (sin > 0 ? (halfHBot / Math.abs(sin)) : Infinity);
    let t = Math.min(tX, tY);

    let ax = cx + cos * t;
    let ay = cy + sin * t;

    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(angle);

    ctx.fillStyle = "#ff4757";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#ff4757";
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-10, -11);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-10, 11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
}
const critIconCache = {};

function drawCritIcon(ctx, x, y, size, color) {
    let key = `${Math.round(size)}_${color}`;
    if (!critIconCache[key] && critIconImg.complete && critIconImg.naturalWidth > 0) {
        let off = document.createElement('canvas');
        off.width = size;
        off.height = size;
        let oCtx = off.getContext('2d');
        oCtx.drawImage(critIconImg, 0, 0, size, size);
        oCtx.globalCompositeOperation = 'source-in';
        oCtx.fillStyle = color;
        oCtx.fillRect(0, 0, size, size);
        critIconCache[key] = off;
    }

    if (critIconCache[key]) {
        ctx.drawImage(critIconCache[key], x, y);
    } else if (!critIconImg.complete || critIconImg.naturalWidth === 0) {
        ctx.save();
        ctx.fillStyle = color;
        ctx.font = `bold ${Math.round(size * 0.75)}px Arial`;
        ctx.fillText("💥", x, y + size * 0.8);
        ctx.restore();
    }
}

function syncHUD() {
    let bossBarWrap = document.getElementById("bossHpContainer");
    if (bossBarWrap) {
        let boss = gameState.enemies.find(e => e.isBoss && !e.dead);
        if (boss) {
            bossBarWrap.style.display = "block";
            document.getElementById("bossNameLabel").innerText = boss.monsterName || "BOSS";
            let maxDisplay = Math.max(boss.stats.maxHp, boss.stats.hp + (boss.shield || 0));
            let hpPct = Math.max(0, (boss.stats.hp / maxDisplay) * 100);
            let shieldPct = Math.max(0, ((boss.shield || 0) / maxDisplay) * 100);

            document.getElementById("bossHpBarFill").style.width = `${hpPct}%`;
            let shieldEl = document.getElementById("bossShieldBarFill");
            if (shieldEl) {
                shieldEl.style.left = `${hpPct}%`;
                shieldEl.style.width = `${shieldPct}%`;
            }
            document.getElementById("bossHpText").innerText = `${Math.round(boss.stats.hp)} / ${Math.round(boss.stats.maxHp)}`;
        } else {
            bossBarWrap.style.display = "none";
        }
    }
    let clockEl = document.getElementById("matchClock");
    if (clockEl) {
        let totalSec = Math.floor(matchTimer);
        let m = Math.floor(totalSec / 60).toString().padStart(2, '0');
        let s = (totalSec % 60).toString().padStart(2, '0');
        clockEl.innerText = `${m}:${s}`;
    }

    [1, 2].forEach(pId => {
        let p = gameState.players[pId - 1];
        if (!p) return;
	
        let hpContainer = document.querySelector(`#hudP${pId} .hp-box`);
        if (hpContainer) {
            let shieldBar = hpContainer.querySelector('.shield-fill-overlay');
            if (!shieldBar) {
                shieldBar = document.createElement('div');
                shieldBar.className = 'shield-fill-overlay';
                hpContainer.appendChild(shieldBar);
            }
            if (p.shield && p.shield > 0) {
                shieldBar.style.display = 'block';
                let shieldRatio = Math.min(1.0, p.shield / p.stats.maxHp);
                shieldBar.style.width = `${shieldRatio * 100}%`;
            } else {
                shieldBar.style.display = 'none';
            }
        }

        let anyTakingBuffed = gameState.players.some(p => p.heroType === 'taking' && p.s3BuffTimer > 0);
        let greenVignetteEl = document.getElementById("greenVignette");
        if (greenVignetteEl) {
            greenVignetteEl.style.display = anyTakingBuffed ? 'block' : 'none';
        }

        document.getElementById(`p${pId}HpBar`).style.width = `${(p.stats.hp / p.stats.maxHp) * 100}%`;
        document.getElementById(`p${pId}HpText`).innerText = `${Math.round(p.stats.hp)}/${Math.round(p.stats.maxHp)}`;

        let mpBar = document.getElementById(`p${pId}MpBar`);
        let mpText = document.getElementById(`p${pId}MpText`);
        if (p.stats.maxMana <= 0) {
            mpBar.style.width = '0%';
            mpText.innerText = '0/0';
        } else {
            mpBar.style.width = `${(p.stats.mana / p.stats.maxMana) * 100}%`;
            mpText.innerText = `${Math.round(p.stats.mana)}/${Math.round(p.stats.maxMana)}`;
        }

        document.getElementById(`p${pId}Gold`).innerText = Math.floor(p.gold);
        document.getElementById(`p${pId}Lvl`).innerText = p.level;
        document.getElementById(`p${pId}Dot`).style.display = p.pendingLevelUps > 0 ? 'block' : 'none';

        for (let i = 1; i <= 3; i++) {
            let ratio = Math.max(0, p.cooldowns[i]) / p.maxCooldowns[i];
            let cdEl = document.getElementById(`p${pId}Cd${i}`);
            if (cdEl) {
                cdEl.style.height = `${Math.min(100, Math.max(0, ratio * 100))}%`;
            }
        }

        let statBox = document.getElementById(`p${pId}StatsCorner`);
        if (statBox) {
            statBox.innerHTML = `
                <div>⚔️ AD: <b style="color:#ff5252">${Math.round(p.stats.ad)}</b></div>
                <div>🔮 AP: <b style="color:#c56cf0">${Math.round(p.stats.ap)}</b></div>
                <div>🛡️ Giáp: <b style="color:#aaa">${Math.round(p.stats.armor)}</b></div>
                <div>🔰 Kháng Phép: <b style="color:#4bcffa">${Math.round(p.stats.mr)}</b></div>
                <div>🗡️ Xuyên Giáp: <b style="color:#ff7675">${Math.round(p.getArmorPen ? p.getArmorPen() : p.stats.armorPen)}</b></div>
                <div>⚡ Tốc Đánh: <b style="color:#ffda79">${p.stats.attackSpeed.toFixed(2)}s</b></div>
                <div>👟 Tốc Chạy: <b style="color:#33d9b2">${Math.round(p.getActualSpeed() * 100)}</b></div>
                <div>🎯 Chí Mạng: <b style="color:#ff9f1a">${Math.round(p.stats.critRate)}%</b></div>
                <div>🩸 Hút Máu: <b style="color:#ff7675">${(p.stats.lifesteal || 0).toFixed(1)}%</b></div>
            `;
        }

        // === CẬP NHẬT PHẦN VẼ TÚI ĐỒ TRONG syncHUD() (main.js) ===
let invEl = document.getElementById(`p${pId}Inventory`);
invEl.innerHTML = "";
for (let s = 0; s < 6; s++) {
    let itemId = p.inventory[s];
    let slot = document.createElement('div');
    slot.className = 'hud-slot';
    slot.style.position = 'relative';

    if (itemId) {
        let it = ITEMS_DATABASE[itemId];
        let img = document.createElement('img');
        img.src = getItemIcon(it);
        img.alt = it.name;
        img.className = 'hud-slot-img';

        let fallbackText = document.createElement('span');
        fallbackText.className = 'slot-fallback-text';
        fallbackText.innerText = it.name.substring(0, 3);
        fallbackText.style.display = 'none';

        img.onerror = () => {
            img.style.display = 'none';
            fallbackText.style.display = 'block';
        };

        slot.appendChild(img);
        slot.appendChild(fallbackText);

        // HIỂN THỊ SỐ LẦN CỘNG DỒN / STACKS TRÊN GÓC ICON TRANG BỊ
        let stackCount = null;
        if (itemId === 'kartana' || itemId === 'guom_diet_quy') {
            stackCount = p.demonMarks || 0;
        } else if (itemId === 'dao_phep_thuat' || itemId === 'kiem_thap_tu') {
            stackCount = p.apDemonMarks || 0;
        } else if (itemId === 'riu_lua' || itemId === 'riu_hoa_long') {
            stackCount = p.hpDemonMarks || 0;
        } else if (itemId === 'sat_chop_kiem') {
            if (p.satChopStacks && p.satChopStacks > 0) stackCount = p.satChopStacks;
        } else if (itemId === 'ma_thien_kiem') {
            if (p.mtkStacks && p.mtkStacks > 0) stackCount = p.mtkStacks;
        } else if (itemId === 'vong_tay_anh_sang') {
            stackCount = p.vtasPoints || 0;
        } else if (itemId === 'gang_tay_anh_hung') {
            stackCount = Math.max(0, 15 - (p.heroRewardUsed || 0));
        }

        if (stackCount !== null && stackCount > 0) {
            let badge = document.createElement('span');
            badge.className = 'hud-slot-stack-badge';
            badge.innerText = stackCount;
            badge.style.cssText = `
                position: absolute;
                bottom: 1px;
                right: 2px;
                background: rgba(0, 0, 0, 0.85);
                color: #ffeb3b;
                font-size: 10px;
                font-weight: bold;
                padding: 0 3px;
                border-radius: 4px;
                border: 1px solid rgba(255, 235, 59, 0.6);
                pointer-events: none;
                z-index: 5;
            `;
            slot.appendChild(badge);
        }

        // Overlay thời gian hồi chiêu
        let remainingCd = (p.itemCooldowns && (p.itemCooldowns[itemId] || (it.uniquePassiveName && p.itemCooldowns[it.uniquePassiveName]))) || 0;
        let maxCd = it.uniqueCooldown || 0;
        if (maxCd > 0 && remainingCd > 0) {
            let cdOverlay = document.createElement('div');
            cdOverlay.className = 'item-cd-radial';
            let progress = Math.min(1.0, remainingCd / maxCd);
            let degrees = Math.round(progress * 360);
            cdOverlay.style.background = `conic-gradient(rgba(0, 0, 0, 0.82) ${degrees}deg, rgba(0, 229, 255, 0.15) ${degrees}deg)`;
            cdOverlay.innerHTML = `<span class="cd-num-text">${remainingCd.toFixed(1)}</span>`;
            slot.appendChild(cdOverlay);
        }
    }
    invEl.appendChild(slot);
}
    });
}

function toggleShop(pId) {
    let modal = document.getElementById("shopModal");
    if (modal.style.display === "flex" && gameState.activeShopPlayer === pId) {
        closeShop();
    } else {
        gameState.activeShopPlayer = pId;
        modal.style.display = "flex";
        renderShopModal();
    }
}
window.toggleShop = toggleShop;

function closeShop() {
    document.getElementById("shopModal").style.display = "none";
    gameState.activeShopPlayer = null;
}
window.closeShop = closeShop;

function changeShopTab(tab, e) {
    gameState.shopTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (e && e.target) {
        e.target.classList.add('active');
    }
    renderShopModal();
}
window.changeShopTab = changeShopTab;

function getMissingAutoBuildComponents(targetItemId, inventory) {
    let target = ITEMS_DATABASE[targetItemId];
    if (!target || !target.recipe || target.recipe.length === 0) return [];

    let invPool = inventory.map((id, index) => ({ id, index, used: false }));
    let candidates = [];

    function collectMissing(reqId) {
        let direct = invPool.find(s => !s.used && s.id === reqId);
        if (direct) {
            direct.used = true;
            return;
        }
        let reqItem = ITEMS_DATABASE[reqId];
        if (!reqItem) return;

        candidates.push(reqId);

        if (reqItem.recipe && reqItem.recipe.length > 0) {
            for (let subReq of reqItem.recipe) {
                collectMissing(subReq);
            }
        }
    }

    for (let reqId of target.recipe) {
        collectMissing(reqId);
    }
    return candidates;
}

function processAutoBuild(p) {
    if (!p || !p.autoBuildItemId) return false;
    let boughtSomething = false;

    for (let step = 0; step < 12; step++) {
        let targetId = p.autoBuildItemId;
        if (!targetId) break;
        let targetItem = ITEMS_DATABASE[targetId];
        if (!targetItem) {
            p.autoBuildItemId = null;
            break;
        }

        // 1. Ưu tiên kiểm tra đủ điều kiện mua trang bị hoàn chỉnh -> mua & tắt soạn đồ
        let fullMatch = typeof getComponentMatches === 'function'
            ? getComponentMatches(targetId, p.inventory)
            : { finalCost: targetItem.cost, totalDiscount: 0, consumedIndices: [] };
        let fullResultingCount = p.inventory.length - fullMatch.consumedIndices.length + 1;

        if (p.gold >= fullMatch.finalCost && fullResultingCount <= 6) {
            p.gold -= fullMatch.finalCost;
            fullMatch.consumedIndices.sort((a, b) => b - a);
            for (let idx of fullMatch.consumedIndices) {
                p.inventory.splice(idx, 1);
            }
            p.inventory.push(targetId);
            p.autoBuildItemId = null;
            recalculatePlayerStats(p);
            boughtSomething = true;

            if (gameState.damageTexts) {
                gameState.damageTexts.push({
                    x: p.x,
                    y: p.y - 40,
                    text: `✅ +${targetItem.name}`,
                    color: '#2ecc71',
                    life: 1.4,
                    isCrit: false
                });
            }
            break;
        }

        // 2. Nếu là đồ không có thành phần nâng dần -> chờ đủ vàng mua trực tiếp
        if (!targetItem.recipe || targetItem.recipe.length === 0) {
            break;
        }

        // 3. Tìm trang bị cấp thấp hơn còn thiếu để mua tự động
        let missingCandidates = getMissingAutoBuildComponents(targetId, p.inventory);
        if (missingCandidates.length === 0) break;

        // Ưu tiên trang bị thành phần bậc cao hơn nếu cùng đủ vàng (tiết kiệm ô đồ)
        missingCandidates.sort((a, b) => {
            let itemA = ITEMS_DATABASE[a];
            let itemB = ITEMS_DATABASE[b];
            return (itemB ? itemB.cost : 0) - (itemA ? itemA.cost : 0);
        });

        let purchasedSub = false;
        for (let subId of missingCandidates) {
            let subItem = ITEMS_DATABASE[subId];
            if (!subItem) continue;

            let subMatch = typeof getComponentMatches === 'function'
                ? getComponentMatches(subId, p.inventory)
                : { finalCost: subItem.cost, totalDiscount: 0, consumedIndices: [] };
            let subResultingCount = p.inventory.length - subMatch.consumedIndices.length + 1;

            if (p.gold >= subMatch.finalCost && subResultingCount <= 6) {
                p.gold -= subMatch.finalCost;
                subMatch.consumedIndices.sort((a, b) => b - a);
                for (let idx of subMatch.consumedIndices) {
                    p.inventory.splice(idx, 1);
                }
                p.inventory.push(subId);
                recalculatePlayerStats(p);
                boughtSomething = true;
                purchasedSub = true;

                if (gameState.damageTexts) {
                    gameState.damageTexts.push({
                        x: p.x,
                        y: p.y - 36,
                        text: `🛒 +${subItem.name}`,
                        color: '#00e5ff',
                        life: 1.1,
                        isCrit: false
                    });
                }
                break;
            }
        }

        if (!purchasedSub) break;
    }

    return boughtSomething;
}
window.processAutoBuild = processAutoBuild;

function toggleShopAutoBuild() {
    let p = gameState.players[gameState.activeShopPlayer - 1];
    let it = ITEMS_DATABASE[gameState.selectedShopItem];
    if (!p || !it) return;

    if (p.autoBuildItemId === it.id) {
        p.autoBuildItemId = null;
    } else {
        p.autoBuildItemId = it.id;
        processAutoBuild(p);
    }
    renderShopModal();
}
window.toggleShopAutoBuild = toggleShopAutoBuild;

function cancelActiveShopAutoBuild() {
    let p = gameState.players[gameState.activeShopPlayer - 1];
    if (!p) return;
    p.autoBuildItemId = null;
    renderShopModal();
}
window.cancelActiveShopAutoBuild = cancelActiveShopAutoBuild;

function renderShopModal() {
    let p = gameState.players[gameState.activeShopPlayer - 1];
    if (!p) return;
    document.getElementById("shopOwnerTitle").innerText = `CỬA HÀNG (PLAYER ${p.id})`;
    document.getElementById("shopOwnerGold").innerText = Math.floor(p.gold);

    let abStatus = document.getElementById("shopAutoBuildStatus");
    let abName = document.getElementById("shopAutoBuildName");
    if (abStatus && abName) {
        if (p.autoBuildItemId && ITEMS_DATABASE[p.autoBuildItemId]) {
            abStatus.style.display = "flex";
            abName.innerText = ITEMS_DATABASE[p.autoBuildItemId].name;
        } else {
            abStatus.style.display = "none";
        }
    }

    let grid = document.getElementById("shopGrid");
    grid.innerHTML = "";
    Object.values(ITEMS_DATABASE).forEach(item => {
        if (item.category === gameState.shopTab) {
            let match = typeof getComponentMatches === 'function' 
                ? getComponentMatches(item.id, p.inventory) 
                : { finalCost: item.cost, totalDiscount: 0, consumedIndices: [] };

            let costHtml = match.totalDiscount > 0
                ? `<span style="color:#2ecc71; font-weight:bold; font-size:12px;">${match.finalCost}💰</span> <s style="color:#888; font-size:10px;">${item.cost}</s>`
                : `<span style="color:#ffb300; font-size:11px;">${item.cost}💰</span>`;

            let isQueued = (p.autoBuildItemId === item.id);
            let card = document.createElement('div');
            card.className = `shop-item-card ${gameState.selectedShopItem === item.id ? 'selected' : ''} ${isQueued ? 'autobuild-target' : ''}`;
            card.innerHTML = `
                <div class="shop-card-content">
                    <div class="shop-thumb-wrap">
                        <img src="${getItemIcon(item)}" class="shop-thumb" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                        <span class="shop-thumb-fallback" style="display:none;">${item.name.substring(0, 2)}</span>
                    </div>
                    <div>
                        <div style="font-weight:bold; font-size:12px;">${isQueued ? '📌 ' : ''}${item.name}</div>
                        <div>${costHtml}</div>
                    </div>
                </div>
            `;
            card.onclick = () => { gameState.selectedShopItem = item.id; renderShopModal(); };
            grid.appendChild(card);
        }
    });

    let cur = ITEMS_DATABASE[gameState.selectedShopItem];
    let previewTitle = document.getElementById("previewTitle");
    let previewDesc = document.getElementById("previewDesc");
    let previewPrice = document.getElementById("previewPrice");
    let previewImg = document.getElementById("previewImg");
    let previewFallback = document.getElementById("previewFallback");
    let btn = document.getElementById("shopActionBtn");
    let autoBtn = document.getElementById("shopAutoBuildBtn");

    if (cur) {
        if (previewImg) {
            previewImg.src = getItemIcon(cur);
            previewImg.style.display = 'block';
            previewImg.onerror = () => {
                previewImg.style.display = 'none';
                if (previewFallback) previewFallback.style.display = 'block';
            };
        }
        if (previewFallback) previewFallback.style.display = 'none';

        let match = typeof getComponentMatches === 'function' 
            ? getComponentMatches(cur.id, p.inventory) 
            : { finalCost: cur.cost, totalDiscount: 0, consumedIndices: [] };

        previewTitle.innerText = cur.name;
        
        let descText = cur.desc;
        if (cur.recipe && cur.recipe.length > 0) {
            let compNames = cur.recipe.map(rId => {
                let rItem = ITEMS_DATABASE[rId];
                return rItem ? rItem.name : rId;
            });
            descText += `\n\n🛠️ Ghép từ: ${compNames.join(' + ')}`;
        }
        previewDesc.innerText = descText;
        previewDesc.scrollTop = 0;

        if (match.totalDiscount > 0) {
            previewPrice.innerHTML = `Giá: <span style="color:#2ecc71; font-weight:bold; font-size:16px;">${match.finalCost}💰</span> <s style="color:#888; font-size:12px;">${cur.cost}💰</s><br><span style="color:#00e5ff; font-size:11px;">(Đã giảm ${match.totalDiscount}💰 từ đồ thành phần)</span>`;
        } else {
            previewPrice.innerText = `Giá: ${cur.cost}💰`;
        }

        let resultingInvCount = p.inventory.length - match.consumedIndices.length + 1;
        let canAfford = p.gold >= match.finalCost;
        let hasSlot = resultingInvCount <= 6;

        btn.disabled = !canAfford || !hasSlot;
        if (!hasSlot) {
            btn.innerText = "TÚI ĐỒ ĐẦY";
        } else if (match.consumedIndices.length > 0) {
            btn.innerText = `NÂNG CẤP (${match.finalCost}💰)`;
        } else {
            btn.innerText = `MUA (${match.finalCost}💰)`;
        }

        if (autoBtn) {
            autoBtn.disabled = false;
            if (p.autoBuildItemId === cur.id) {
                autoBtn.classList.add('active');
                autoBtn.innerText = "HỦY SOẠN ĐỒ";
            } else {
                autoBtn.classList.remove('active');
                autoBtn.innerText = "SOẠN ĐỒ";
            }
        }
    } else {
        if (previewImg) previewImg.style.display = 'none';
        if (previewFallback) previewFallback.style.display = 'block';
        previewTitle.innerText = "Chọn trang bị";
        previewDesc.innerText = "";
        previewPrice.innerText = "";
        btn.disabled = true;
        btn.innerText = "MUA";
        if (autoBtn) {
            autoBtn.disabled = true;
            autoBtn.classList.remove('active');
            autoBtn.innerText = "SOẠN ĐỒ";
        }
    }

    let invRow = document.getElementById("shopInvSlots");
    invRow.innerHTML = "";
    for (let s = 0; s < 6; s++) {
        let itId = p.inventory[s];
        let slot = document.createElement('div');
        slot.className = 'inv-slot';
        if (itId) {
            let it = ITEMS_DATABASE[itId];
            slot.title = `Click để bán (+${Math.floor(it.cost * 0.7)}💰)`;
            
            let img = document.createElement('img');
            img.src = getItemIcon(it);
            img.className = 'inv-slot-img';
            img.onerror = () => {
                img.style.display = 'none';
                slot.innerText = it.name.substring(0, 3);
            };
            slot.appendChild(img);

            slot.onclick = () => {
                p.gold += Math.floor(it.cost * 0.7);
                p.inventory.splice(s, 1);
                recalculatePlayerStats(p);
                renderShopModal();
            };
        } else {
            slot.innerText = "Trống";
        }
        invRow.appendChild(slot);
    }
}

function executeShopAction() {
    let p = gameState.players[gameState.activeShopPlayer - 1];
    let it = ITEMS_DATABASE[gameState.selectedShopItem];
    if (!p || !it) return;

    let match = typeof getComponentMatches === 'function' 
        ? getComponentMatches(it.id, p.inventory) 
        : { finalCost: it.cost, totalDiscount: 0, consumedIndices: [] };

    let resultingInvCount = p.inventory.length - match.consumedIndices.length + 1;
    if (resultingInvCount > 6) return;
    if (p.gold < match.finalCost) return;

    p.gold -= match.finalCost;

    match.consumedIndices.sort((a, b) => b - a);
    for (let idx of match.consumedIndices) {
        p.inventory.splice(idx, 1);
    }

    p.inventory.push(it.id);

    if (p.autoBuildItemId === it.id) {
        p.autoBuildItemId = null;
    }

    recalculatePlayerStats(p);
    renderShopModal();
}
window.executeShopAction = executeShopAction;

// Điều hướng chọn thẻ sang giao diện mới của select.js
function openCardSelect(pId) {
    if (typeof openCardSelectCustom === 'function') {
        openCardSelectCustom(pId);
    }
}
window.openCardSelect = openCardSelect;

function togglePracticeSettings() {
    let modal = document.getElementById("practiceModal");
    if (!modal) return;
    modal.style.display = (modal.style.display === "flex") ? "none" : "flex";
}
window.togglePracticeSettings = togglePracticeSettings;

function toggleDummyInvis() {
    if (!gameState.dummy) return;
    gameState.dummy.isInvisible = !gameState.dummy.isInvisible;
    let btn = document.getElementById("btnToggleDummyInvis");
    if (btn) {
        btn.classList.toggle('active', gameState.dummy.isInvisible);
        btn.innerText = gameState.dummy.isInvisible ? "👻 Tàng Hình: BẬT" : "👻 Tàng Hình: TẮT";
    }
}
window.toggleDummyInvis = toggleDummyInvis;

function togglePracticeMonsterSpawn() {
    gameState.practiceSpawnMonsters = !gameState.practiceSpawnMonsters;
    let btn = document.getElementById("btnToggleDummySpawn");
    if (btn) {
        btn.classList.toggle('active', gameState.practiceSpawnMonsters);
        btn.innerText = gameState.practiceSpawnMonsters ? "👾 Sinh Quái: BẬT" : "👾 Sinh Quái: TẮT";
    }
}
window.togglePracticeMonsterSpawn = togglePracticeMonsterSpawn;

function togglePracticeFreezeMonsters() {
    gameState.practiceFreezeMonsters = !gameState.practiceFreezeMonsters;
    let btn = document.getElementById("btnToggleFreezeMonsters");
    if (btn) {
        btn.classList.toggle('active', gameState.practiceFreezeMonsters);
        btn.innerText = gameState.practiceFreezeMonsters ? "❄️ Băng Hà Quái: BẬT" : "❄️ Băng Hà Quái: TẮT";
    }
}
window.togglePracticeFreezeMonsters = togglePracticeFreezeMonsters;

function actionPracticeResetDummy() {
    if (!gameState.dummy || !gameState.players[0]) return;
    let p = gameState.players[0];
    gameState.dummy.x = p.x + 180;
    gameState.dummy.y = p.y;
    gameState.dummy.totalDamageTaken = 0;
    gameState.dummy.dps = 0;
    gameState.dummy.damageInSecond = 0;
}
window.actionPracticeResetDummy = actionPracticeResetDummy;

function actionPracticeGiveGold() {
    gameState.players.forEach(p => p.gold += 10000);
}
window.actionPracticeGiveGold = actionPracticeGiveGold;

function actionPracticeResetCD() {
    gameState.players.forEach(p => {
        p.cooldowns['1'] = 0;
        p.cooldowns['2'] = 0;
        p.cooldowns['3'] = 0;
        p.attackCooldown = 0;
        p.itemCooldowns = {};
    });
}
window.actionPracticeResetCD = actionPracticeResetCD;

function actionPracticeFullHeal() {
    gameState.players.forEach(p => {
        p.stats.hp = p.stats.maxHp;
        p.stats.mana = p.stats.maxMana;
    });
}
window.actionPracticeFullHeal = actionPracticeFullHeal;

function actionPracticeSpawnDummy() {
    let p1 = gameState.players[0];
    if (!p1 || typeof DummyMonster !== 'function') return;

    let newDummy = new DummyMonster(p1.x, p1.y);
    if (!gameState.dummy || gameState.dummy.dead) {
        gameState.dummy = newDummy;
    }
    gameState.enemies.push(newDummy);
}
window.actionPracticeSpawnDummy = actionPracticeSpawnDummy;

function actionPracticeSpawnMonsterByCode() {
    let inputEl = document.getElementById("practiceSpawnInput");
    if (!inputEl || typeof spawnMonsterByCode !== 'function') return;

    let rawCode = inputEl.value.trim();
    if (!rawCode) return;

    let p = gameState.players.find(pl => pl && !pl.dead) || gameState.players[0];
    if (!p) return;

    let angle = Math.random() * Math.PI * 2;
    let dist = 140 + Math.random() * 140;
    let sx = Math.max(80, Math.min(WORLD_WIDTH - 80, p.x + Math.cos(angle) * dist));
    let sy = Math.max(80, Math.min(WORLD_HEIGHT - 80, p.y + Math.sin(angle) * dist));

    let waveLv = 1 + Math.floor(matchTimer / 30);
    let mon = spawnMonsterByCode(rawCode, sx, sy, waveLv);
    if (mon) {
        gameState.enemies.push(mon);
    } else {
        alert("Không tìm thấy quái! Thử nhập: #z, #zk, #w, #c, #kc, #m, #ag, #bag");
    }
}
window.actionPracticeSpawnMonsterByCode = actionPracticeSpawnMonsterByCode;