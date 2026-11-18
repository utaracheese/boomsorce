// =============================================================================
// MAGA.JS - TƯỚNG MAGADOT: VŨ KHÍ BIẾN HÓA, VŨ KHÍ 2 (CUNG) & TRẠNG THÁI LƠ LỬNG
// =============================================================================

// Quản lý và cache các Sprite Sheet cắt 10 frame cho kiếm
const MAGA_SPRITES = {};
function getMagaSpriteSheet(path) {
    if (!MAGA_SPRITES[path]) {
        const img = new Image();
        img.src = `assets/Frames/${path}`;
        MAGA_SPRITES[path] = img;
    }
    return MAGA_SPRITES[path];
}

// Hiệu ứng chém sử dụng Sprite Sheet cắt 10 frame (Kiếm ngắn)
class MagaSlashEffect {
    constructor(cfg) {
        this.owner = cfg.owner;
        this.x = cfg.x;
        this.y = cfg.y;
        this.angle = cfg.angle || 0;
        this.damage = cfg.damage || 0;
        this.dmgType = cfg.dmgType || 'physical';
        this.isDeathSlash = cfg.isDeathSlash || false;
        this.isCrit = cfg.isCrit || false;
        this.attackType = cfg.attackType || 'skill';
        this.range = cfg.range || 75;
        this.width = cfg.width || 70;
        this.spritePath = cfg.spritePath;
        this.scale = cfg.scale || 1.8;
        this.fps = cfg.fps || 25;
        this.damageOnFrame = cfg.damageOnFrame !== undefined ? cfg.damageOnFrame : 3;
        this.onHitExtra = cfg.onHitExtra || null;

        this.sheetImg = getMagaSpriteSheet(this.spritePath);
        this.time = 0;
        this.totalFrames = 10;
        this.hasDealtDamage = false;
        this.dead = false;
    }

    update(dt) {
        this.time += dt;
        let currentFrame = Math.floor(this.time * this.fps) + 1;

        if (!this.hasDealtDamage && currentFrame >= this.damageOnFrame) {
            this.hasDealtDamage = true;
            this.dealHitboxDamage();
        }

        if (currentFrame > this.totalFrames) {
            this.dead = true;
        }
    }

    dealHitboxDamage() {
        if (!this.owner) return;
        let fx = Math.cos(this.angle);
        let fy = Math.sin(this.angle);

        gameState.enemies.forEach(enemy => {
            if (enemy.dead) return;
            let toX = enemy.x - this.x;
            let toY = enemy.y - this.y;
            let proj = toX * fx + toY * fy;

            if (proj >= -10 && proj <= this.range + enemy.radius) {
                let perpDist = Math.abs(toX * (-fy) + toY * fx);
                if (perpDist <= (this.width / 2 + enemy.radius)) {
                    enemy.takeDamage(this.damage, this.dmgType, this.owner, this.isCrit, this.attackType);
                    if (this.onHitExtra) this.onHitExtra(enemy);
                    if (typeof processItemOnHitPassives === 'function') {
                        processItemOnHitPassives(this.owner, enemy, this);
                    }
                }
            }
        });
    }

    draw(ctx) {
        if (this.dead || !this.sheetImg.complete || this.sheetImg.naturalWidth === 0) return;

        let frameWidth = this.sheetImg.naturalWidth / this.totalFrames;
        let frameHeight = this.sheetImg.naturalHeight;
        let frameIdx = Math.min(this.totalFrames - 1, Math.floor(this.time * this.fps));
        let sx = frameIdx * frameWidth;
        let sy = 0;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        let drawW = frameWidth * this.scale;
        let drawH = frameHeight * this.scale;

        ctx.drawImage(
            this.sheetImg,
            sx, sy, frameWidth, frameHeight,
            -drawW * 0.25, -drawH * 0.5, drawW, drawH
        );
        ctx.restore();
    }
}

// === HIỆU ỨNG TÊN RƠI TỪ TRÊN CAO (CHIÊU 3 CUNG) ===
class MagaRainArrow {
    constructor(cfg) {
        this.owner = cfg.owner;
        this.targetX = cfg.targetX;
        this.targetY = cfg.targetY;
        this.startX = cfg.startX;
        this.startY = cfg.startY;
        this.isDeath = cfg.isDeath;
        this.damage = cfg.damage;
        this.radius = cfg.radius || (cfg.isDeath ? 90 : 45); // Dạng tử bán kính gấp đôi
        this.delay = 0.5; // Chờ 0.5s bay tới
        this.timer = 0;
        this.dead = false;

        // Tải frame đạn
        if (this.isDeath) {
            getAnimFrames('Curses/Skull Shot', 8);
            getAnimFrames('Curses/Skull Hit', 5);
        } else {
            getAnimFrames('Projectiles/Arrow Trail', 11);
            getAnimFrames('Hit Sparks/Weak Hit', 4);
        }
    }

    update(dt) {
        this.timer += dt;
        if (this.timer >= this.delay) {
            this.dead = true;
            this.explode();
        }
    }

    explode() {
        // Gây sát thương AoE xung quanh điểm rơi
        gameState.enemies.forEach(enemy => {
            if (enemy.dead) return;
            if (Math.hypot(enemy.x - this.targetX, enemy.y - this.targetY) <= (this.radius + enemy.radius)) {
                let isCrit = Math.random() * 100 < this.owner.stats.critRate;
                let critMulti = isCrit ? (2.0 + ((this.owner.stats.critDamage || 0) / 100)) : 1.0;
                let finalDmg = this.damage * critMulti;

                enemy.takeDamage(finalDmg, 'physical', this.owner, isCrit, 'skill');
                if (typeof processItemOnHitPassives === 'function') {
                    processItemOnHitPassives(this.owner, enemy, this);
                }
                if (this.owner.inDeathState && enemy.dead) {
                    this.owner.deathStateKills++;
                }
            }
        });

        // Hiệu ứng nổ tại tâm chạm
        if (this.isDeath) {
            let scaleHit = (this.radius * 2) / 48;
            if (typeof spawnAnimatedEffect === 'function') {
                spawnAnimatedEffect('Curses/Skull Hit', this.targetX, this.targetY, {
                    scale: scaleHit,
                    fps: 18,
                    rotation: 0
                });
            }
        } else {
            if (typeof spawnAnimatedEffect === 'function') {
                spawnAnimatedEffect('Hit Sparks/Weak Hit', this.targetX, this.targetY, {
                    scale: 1.8,
                    fps: 20,
                    rotation: Math.random() * Math.PI * 2
                });
            }
        }
    }

    draw(ctx) {
        // 1. Vẽ ô tròn báo hiệu tại vị trí tiếp đất
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.targetX, this.targetY, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = this.isDeath ? 'rgba(231, 76, 60, 0.75)' : 'rgba(241, 196, 15, 0.75)';
        ctx.lineWidth = 2;
        ctx.stroke();

        let progress = Math.min(1.0, this.timer / this.delay);
        ctx.beginPath();
        ctx.arc(this.targetX, this.targetY, this.radius * (1 - progress), 0, Math.PI * 2);
        ctx.strokeStyle = this.isDeath ? 'rgba(192, 57, 43, 0.4)' : 'rgba(243, 156, 18, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        // 2. Vẽ mũi tên / đầu lâu đang bay chéo từ trên xuống
        let curX = this.startX + (this.targetX - this.startX) * progress;
        let curY = this.startY + (this.targetY - this.startY) * progress;
        let angle = Math.atan2(this.targetY - this.startY, this.targetX - this.startX);

        let folder = this.isDeath ? 'Curses/Skull Shot' : 'Projectiles/Arrow Trail';
        let frames = typeof getValidFrames === 'function' ? getValidFrames(folder) : [];
        if (frames.length > 0) {
            let frameIdx = Math.floor(this.timer * 20) % frames.length;
            let img = frames[frameIdx];
            if (img && img.naturalWidth > 0) {
                ctx.save();
                ctx.translate(curX, curY);
                ctx.rotate(angle);
                let w = img.naturalWidth * 1.5;
                let h = img.naturalHeight * 1.5;
                ctx.drawImage(img, -w / 2, -h / 2, w, h);
                ctx.restore();
            }
        }
    }
}

// === LỚP TƯỚNG MAGADOT ===
class Magadot extends PlayerHero {
    constructor(id, x, y, extraConfig = {}) {
        super(id, x, y, {
            maxHp: 560,
            hpRegen: 3.5,
            maxMana: 0,
            manaRegen: 0,
            ad: 36,
            ap: 0,
            attackSpeed: 0.75,
            speed: 3.9,
            armor: 28,
            mr: 24,
            critRate: 10,
            ...extraConfig
        });
        this.heroType = 'magadot';
        this.color = id === 1 ? '#e74c3c' : '#c0392b';

        // Hệ thống vũ khí (Kiếm ngắn & Cung)
        this.weaponList = ['short_sword', 'bow'];
        this.currentWeapon = 'short_sword';
        this.chestOpenCooldown = 0;

        // Cờ miễn tử từ lệnh test code
        this.isGodmodeTest = false;

        // Nội tại 2: Trạng thái Tử
        this.inDeathState = false;
        this.deathStateTimer = 0;
        this.deathStateKills = 0;
        this.deathStateReviveCooldown = 0;
        this.isReviving = false;
        this.reviveTimer = 0;
        this.reviveX = x;
        this.reviveY = y;
        this.extendedBonusApplied = false;

        // Hướng nhìn di chuyển
        this.facingLeft = false;

        // Combo Kiếm ngắn
        this.baseSlashIndex = 1;

        // Kỹ năng Chiêu Kiếm ngắn
        this.s2Channeling = false;
        this.s2Timer = 0;
        this.s2LockedAngle = 0;
        this.s2ShotsFired = 0;
        this.s3DebuffTimer = 0;
        this.s3HealTickTimer = 0;
        this.s3BuffTimer = 0;

        // CƠ CHẾ VŨ KHÍ 2 (CUNG)
        this.bowRange = 460;
        this.bowS1Charges = 0;       // Đòn cường hóa chiêu 1 (3 đòn)
        this.bowS1Timer = 0;         // Hết 1s không bắn mất cường hóa
        this.bowS2StunTimer = 0;     // Khựng 0.25s khi dùng chiêu 2
        this.bowS2DashTimer = 0;     // Thời gian lướt
        this.bowS2DashVx = 0;
        this.bowS2DashVy = 0;

        // TRẠNG THÁI LƠ LỬNG (CHIÊU 3 CUNG)
        this.isLevitating = false;
        this.levitateTimer = 0;
        this.levitateDuration = 3.0;
        this.levitateHeight = 0;     // Độ cao nhảy lên của hình ảnh
        this.levitateTargetX = 0;
        this.levitateTargetY = 0;
        this.rainTimer = 0;
        this.rainShotsFired = 0;
        this.rainArrowsList = [];

        // Tải trước frame hoạt ảnh
        if (typeof getAnimFrames === 'function') {
            getAnimFrames('Ambient/Aurora', 24);
            getAnimFrames('Pickups and UI/Rank Up', 9);
            getAnimFrames('Projectiles/Arrow Trail', 11);
            getAnimFrames('Hit Sparks/Weak Hit', 4);
            getAnimFrames('Curses/Skull Shot', 8);
            getAnimFrames('Curses/Skull Hit', 5);
        }
        getMagaSpriteSheet('Slashes/c1slash27.png');
        getMagaSpriteSheet('Slashes/c1slash17.png');
        getMagaSpriteSheet('Slashes/c1slash23.png');
        getMagaSpriteSheet('Slashes/c1slash13.png');
        getMagaSpriteSheet('Slashes/base1.png');
        getMagaSpriteSheet('Slashes/base2.png');
        getMagaSpriteSheet('Slashes/base3.png');
        getMagaSpriteSheet('Slashes/base1n.png');
        getMagaSpriteSheet('Slashes/base2n.png');
        getMagaSpriteSheet('Slashes/base3n.png');
    }

    // Tương tác rương đổi vũ khí (Nội tại 1)
    interactChest() {
        if (this.dead || this.isReviving || this.chestOpenCooldown > 0) return;

        let available = this.weaponList.filter(w => w !== this.currentWeapon);
        if (available.length > 0) {
            let nextWeapon = available[Math.floor(Math.random() * available.length)];
            this.currentWeapon = nextWeapon;
            // Reset các buff theo vũ khí
            this.bowS1Charges = 0;
            this.bowS1Timer = 0;
        }
        this.chestOpenCooldown = 0.5;
    }

    // Nhận sát thương - Kiểm tra trạng thái Lơ lửng & Trạng thái Tử
    takeDamage(amount, type, attacker = null, isCrit = false, source = 'skill') {
        if (this.dead || this.isReviving) return 0;

        // Trạng thái lơ lửng: miễn nhiễm đạn quái và đòn đánh gần (trừ sát thương có tag bypass)
        if (this.isLevitating && !extraConfigBypass(source)) {
            return 0;
        }

        let finalDmg = super.takeDamage(amount, type, attacker, isCrit, source);

        if (this.stats.hp <= 0) {
            if (!this.inDeathState && this.deathStateReviveCooldown <= 0) {
                this.dead = false;
                this.stats.hp = 1;
                this.isReviving = true;
                this.reviveTimer = 2.5;
                this.reviveX = this.x;
                this.reviveY = this.y;
                if (this.isLevitating) this.endLevitation();
            }
        }
        return finalDmg;
    }

    enterDeathState() {
        this.isReviving = false;
        this.inDeathState = true;
        this.deathStateTimer = 15.0;
        this.deathStateKills = 0;
        this.extendedBonusApplied = false;
        this.deathStateReviveCooldown = 90.0;
        this.stats.hp = this.stats.maxHp;
    }

    getActualSpeed() {
        let s = this.stats.speed;
        if (this.s2Channeling) s *= 0.25;
        if (this.bowS2StunTimer > 0) return 0; // Đang khựng khi bắn chiêu 2 cung
        return s;
    }

    update(dt) {
        if (this.chestOpenCooldown > 0) this.chestOpenCooldown -= dt;
        if (this.deathStateReviveCooldown > 0) this.deathStateReviveCooldown -= dt;

        // Chờ hồi sinh 2.5s
        if (this.isReviving) {
            this.x = this.reviveX;
            this.y = this.reviveY;
            this.reviveTimer -= dt;
            if (this.reviveTimer <= 0) {
                this.enterDeathState();
            }
            return;
        }

        super.update(dt);
        if (this.dead) return;

        // Logic Trạng thái Tử
        if (this.inDeathState) {
            this.deathStateTimer -= dt;

            if (this.deathStateKills >= 20 && !this.extendedBonusApplied) {
                this.extendedBonusApplied = true;
                this.deathStateTimer += 5.0;
            }

            if (this.deathStateTimer <= 0) {
                if (this.isGodmodeTest) {
                    this.enterDeathState();
                } else {
                    this.inDeathState = false;
                    if (this.deathStateKills < 20) {
                        this.takeDamage(this.stats.maxHp * 5.0, 'true', null, false, 'dot');
                    }
                }
            }
        }

        // Cập nhật Cung Chiêu 1 đếm ngược
        if (this.bowS1Charges > 0) {
            this.bowS1Timer -= dt;
            if (this.bowS1Timer <= 0) {
                this.bowS1Charges = 0;
            }
        }

        // Cập nhật Cung Chiêu 2 (khựng & lướt)
        if (this.bowS2StunTimer > 0) {
            this.bowS2StunTimer -= dt;
            if (this.bowS2StunTimer <= 0) {
                // Bắt đầu lướt
                this.bowS2DashTimer = 0.16;
            }
        } else if (this.bowS2DashTimer > 0) {
            this.bowS2DashTimer -= dt;
            let dashSpeed = 16.0;
            this.x += this.bowS2DashVx * dashSpeed;
            this.y += this.bowS2DashVy * dashSpeed;
            // Giới hạn bản đồ
            this.x = Math.max(80, Math.min(WORLD_WIDTH - 80, this.x));
            this.y = Math.max(80, Math.min(WORLD_HEIGHT - 80, this.y));
        }

        // CẬP NHẬT TRẠNG THÁI LƠ LỬNG (CHIÊU 3 CUNG)
        if (this.isLevitating) {
            this.levitateTimer -= dt;
            let elapsed = this.levitateDuration - this.levitateTimer;

            // Mô phỏng độ cao: Nhảy vút lên cao 85px trong 0.35s đầu, sau đó rơi chậm dần
            if (elapsed < 0.35) {
                this.levitateHeight = (elapsed / 0.35) * 85;
            } else {
                let dropProgress = (elapsed - 0.35) / (this.levitateDuration - 0.35);
                this.levitateHeight = 85 - (dropProgress * 42.5);
            }

            // Liên tục bắn 10 tên trong 3s (mỗi 0.3s bắn 1 phát)
            this.rainTimer += dt;
            let shotInterval = this.levitateDuration / 10; // 0.3s mỗi mũi tên

            while (this.rainShotsFired < 10 && this.rainTimer >= (this.rainShotsFired * shotInterval)) {
                this.rainShotsFired++;
                
                // LẤY TỌA ĐỘ BẮN THAY ĐỔI THEO THỜI GIAN THỰC (REAL-TIME AIM)
                let aimPos = this.calculateRealtimeRainTarget();
                this.fireRainArrow(aimPos.x, aimPos.y);
            }

            if (this.levitateTimer <= 0) {
                this.endLevitation();
            }
        }

        // Cập nhật các mũi tên rơi xuống đất của chiêu 3
        for (let i = this.rainArrowsList.length - 1; i >= 0; i--) {
            let ra = this.rainArrowsList[i];
            ra.update(dt);
            if (ra.dead) this.rainArrowsList.splice(i, 1);
        }

        // Cập nhật kỹ năng Kiếm ngắn (s2, s3)
        if (this.currentWeapon === 'short_sword') {
            if (this.s2Channeling) {
                this.s2Timer -= dt;
                let shotInterval = 1.2 / 4;
                let expectedShots = Math.min(4, Math.floor((1.2 - this.s2Timer) / shotInterval) + 1);

                while (this.s2ShotsFired < expectedShots && this.s2ShotsFired < 4) {
                    this.s2ShotsFired++;
                    let usedIdx = this.baseSlashIndex;
                    let isCrit = Math.random() * 100 < this.stats.critRate;
                    let critMulti = isCrit ? (2.0 + ((this.stats.critDamage || 0) / 100)) : 1.0;
                    let s2Damage = (this.stats.ad * 0.70) * critMulti;

                    this.fireSingleSwordSlash(this.s2LockedAngle, s2Damage, false, usedIdx, isCrit, 'basic_attack');

                    if (this.inDeathState) {
                        let lockedA = this.s2LockedAngle;
                        let lockedX = this.x;
                        let lockedY = this.y;
                        let isCritDeath = Math.random() * 100 < this.stats.critRate;
                        let critDeathMulti = isCritDeath ? 2.0 : 1.0;
                        let s2DeathDamage = (this.stats.ad * 0.175) * critDeathMulti;

                        setTimeout(() => {
                            this.fireSingleSwordSlashAt(lockedX, lockedY, lockedA, s2DeathDamage, true, usedIdx, isCritDeath, 'basic_attack');
                        }, 300);
                    }
                }

                if (this.s2Timer <= 0 || this.s2ShotsFired >= 4 || this.stunTimer > 0) {
                    this.s2Channeling = false;
                }
            }

            if (this.s3DebuffTimer > 0) {
                this.s3DebuffTimer -= dt;
                this.s3HealTickTimer += dt;
                if (this.s3HealTickTimer >= 0.5) {
                    this.s3HealTickTimer -= 0.5;
                    this.heal(this.stats.maxHp * 0.015);
                }
                if (this.s3DebuffTimer <= 0) {
                    this.s3BuffTimer = 3.0;
                    if (typeof spawnAnimatedEffect === 'function') {
                        spawnAnimatedEffect('Pickups and UI/Rank Up', this.x, this.y, {
                            scale: 1.5,
                            fps: 18,
                            rotation: 0
                        });
                    }
                }
            }

            if (this.s3BuffTimer > 0) {
                this.s3BuffTimer -= dt;
            }
        }
    }

    endLevitation() {
        this.isLevitating = false;
        this.levitateTimer = 0;
        this.levitateHeight = 0;
    }

    // === TẤN CÔNG THƯỜNG ===
    castBasicAttack(targetAngle) {
        if (this.attackCooldown > 0 || this.stunTimer > 0 || this.isResting || this.isReviving) return;
        if (this.s2Channeling || this.s3DebuffTimer > 0 || this.bowS2StunTimer > 0) return;

        if (this.currentWeapon === 'bow') {
            this.castBowBasicAttack(targetAngle);
        } else {
            this.castSwordBasicAttack(targetAngle);
        }
    }

    // --- ĐÁNH THƯỜNG KIẾM NGẮN ---
    castSwordBasicAttack(targetAngle) {
        let baseCd = 0.75;
        if (this.s3BuffTimer > 0) {
            baseCd = 0.75 / (1 + 1.0 + this.attackSpeedBonus);
        } else {
            baseCd = 0.75 / (1 + this.attackSpeedBonus);
        }
        this.attackCooldown = baseCd;
        this.angle = targetAngle;

        let curX = this.x;
        let curY = this.y;

        if (this.s3BuffTimer > 0) {
            for (let k in this.cooldowns) {
                if (this.cooldowns[k] > 0) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - 1.0);
            }
        }

        let currentSlashIdx = this.baseSlashIndex;
        let isCrit = Math.random() * 100 < this.stats.critRate;
        let critMulti = isCrit ? (2.0 + ((this.stats.critDamage || 0) / 100)) : 1.0;
        let baseDamage = (this.stats.ad * 0.70) * critMulti;

        this.fireSingleSwordSlash(targetAngle, baseDamage, false, currentSlashIdx, isCrit, 'basic_attack');

        if (this.inDeathState) {
            let isCritDeath = Math.random() * 100 < this.stats.critRate;
            let deathCritMulti = isCritDeath ? 2.0 : 1.0;
            let deathDamage = (this.stats.ad * 0.175) * deathCritMulti;

            setTimeout(() => {
                this.fireSingleSwordSlashAt(curX, curY, targetAngle, deathDamage, true, currentSlashIdx, isCritDeath, 'basic_attack');
            }, 400);
        }
    }

    fireSingleSwordSlash(angle, damage, isDeath, forcedIdx = null, isCrit = false, attackType = 'basic_attack') {
        this.fireSingleSwordSlashAt(this.x, this.y, angle, damage, isDeath, forcedIdx, isCrit, attackType);
    }

    fireSingleSwordSlashAt(posX, posY, angle, damage, isDeath, forcedIdx = null, isCrit = false, attackType = 'basic_attack') {
        let idx = forcedIdx !== null ? forcedIdx : this.baseSlashIndex;
        let spriteFile = isDeath ? `Slashes/base${idx}n.png` : `Slashes/base${idx}.png`;

        if (!isDeath && forcedIdx === null) {
            this.baseSlashIndex = (this.baseSlashIndex % 3) + 1;
        } else if (!isDeath && forcedIdx !== null) {
            this.baseSlashIndex = (forcedIdx % 3) + 1;
        }

        if (typeof gameState !== 'undefined' && gameState.magaSlashes) {
            gameState.magaSlashes.push(new MagaSlashEffect({
                owner: this,
                x: posX,
                y: posY,
                angle: angle,
                damage: damage,
                dmgType: 'physical',
                isDeathSlash: isDeath,
                isCrit: isCrit,
                attackType: attackType,
                range: 75,
                width: 70,
                spritePath: spriteFile,
                scale: 1.8,
                damageOnFrame: 3,
                onHitExtra: (enemy) => {
                    if (this.inDeathState && enemy.dead) {
                        this.deathStateKills++;
                    }
                }
            }));
        }
    }

    // --- ĐÁNH THƯỜNG VŨ KHÍ 2: CUNG ---
    castBowBasicAttack(targetAngle) {
        let cd = 0.70 / (1 + this.attackSpeedBonus);
        this.attackCooldown = cd;
        this.angle = targetAngle;

        let isEnhanced = this.bowS1Charges > 0;
        if (isEnhanced) {
            this.bowS1Charges--;
            this.bowS1Timer = 1.0; // Reset time 1s
        }

        // Bắn 1 mũi tên (hoặc 3 mũi tên tạo góc 15 độ nếu đang được cường hóa bởi Chiêu 1)
        let angles = isEnhanced ? [targetAngle - 0.2618, targetAngle, targetAngle + 0.2618] : [targetAngle];

        angles.forEach(ang => {
            this.fireBowProjectile(ang, this.stats.ad * 1.0, this.inDeathState);
        });
    }

    // Bắn đạn cung (Dạng thường: mũi tên / Dạng tử: đầu lâu phát nổ)
    fireBowProjectile(angle, baseDamage, isDeath) {
        let isCrit = Math.random() * 100 < this.stats.critRate;
        let critMulti = isCrit ? (2.0 + ((this.stats.critDamage || 0) / 100)) : 1.0;
        let finalDamage = baseDamage * critMulti;

        if (isDeath) {
            // DẠNG TỬ: Bắn đầu lâu bay tới, trúng gây 100% AD và nổ gây 25% AD xung quanh
            let skullSpeed = 10.5;
            let splashR = 85;

            let proj = new Projectile({
                owner: this,
                attackType: 'basic_attack',
                x: this.x,
                y: this.y,
                vx: Math.cos(angle),
                vy: Math.sin(angle),
                radius: 12,
                speed: skullSpeed,
                damage: finalDamage,
                dmgType: 'physical',
                color: '#e74c3c',
                range: this.bowRange,
                isCrit: isCrit,
                spriteFolder: 'Curses/Skull Shot',
                spriteScale: 1.6,
                spriteFps: 22,
                hasSplash: true,
                splashRatio: 0.25, // 25% AD xung quanh
                hitEffect: 'Curses/Skull Hit',
                hitEffectScale: (splashR * 2) / 48,
                onHitExtra: (enemy) => {
                    if (this.inDeathState && enemy.dead) {
                        this.deathStateKills++;
                    }
                }
            });
            gameState.projectiles.push(proj);
        } else {
            // DẠNG THƯỜNG: Bắn tên thẳng gây 100% AD STVL
            let arrowSpeed = 12.5;

            let proj = new Projectile({
                owner: this,
                attackType: 'basic_attack',
                x: this.x,
                y: this.y,
                vx: Math.cos(angle),
                vy: Math.sin(angle),
                radius: 8,
                speed: arrowSpeed,
                damage: finalDamage,
                dmgType: 'physical',
                color: '#f1c40f',
                range: this.bowRange,
                isCrit: isCrit,
                spriteFolder: 'Projectiles/Arrow Trail',
                spriteScale: 1.4,
                spriteFps: 24,
                hitEffect: 'Hit Sparks/Weak Hit',
                hitEffectScale: 1.6,
                onHitExtra: (enemy) => {
                    if (this.inDeathState && enemy.dead) {
                        this.deathStateKills++;
                    }
                }
            });
            gameState.projectiles.push(proj);
        }
    }

    // === CHIÊU 1 ===
    castSkill1(targetAngle) {
        if (this.cooldowns['1'] > 0 || this.isResting || this.isReviving || this.s2Channeling || this.s3DebuffTimer > 0) return;

        if (this.currentWeapon === 'bow') {
            // CUNG CHIÊU 1: Cường hóa đòn đánh thường trong 3 đòn kế
            this.cooldowns['1'] = 6.0 * (1 - Math.min(0.4, this.stats.cdr));
            this.bowS1Charges = 3;
            this.bowS1Timer = 1.0;
        } else {
            // KIẾM CHIÊU 1
            this.cooldowns['1'] = 7.0 * (1 - Math.min(0.4, this.stats.cdr));
            this.angle = targetAngle;
            let slashRange = 125;
            let slashWidth = 210;
            let sX = this.x;
            let sY = this.y;

            this.fireBigSlash(sX, sY, targetAngle, this.stats.ad * 1.50, 'Slashes/c1slash27.png', slashRange, slashWidth);
            setTimeout(() => {
                if (this.dead) return;
                this.fireBigSlash(this.x, this.y, targetAngle, this.stats.ad * 1.20, 'Slashes/c1slash17.png', slashRange, slashWidth);
            }, 300);

            if (this.inDeathState) {
                setTimeout(() => {
                    if (this.dead) return;
                    let deathX = this.x;
                    let deathY = this.y;
                    this.fireBigSlash(deathX, deathY, targetAngle, this.stats.ad * 0.40, 'Slashes/c1slash23.png', slashRange, slashWidth);
                    setTimeout(() => {
                        if (this.dead) return;
                        this.fireBigSlash(this.x, this.y, targetAngle, this.stats.ad * 0.30, 'Slashes/c1slash13.png', slashRange, slashWidth);
                    }, 300);
                }, 800);
            }
        }
    }

    fireBigSlash(posX, posY, angle, damage, spritePath, range, width) {
        if (typeof gameState !== 'undefined' && gameState.magaSlashes) {
            gameState.magaSlashes.push(new MagaSlashEffect({
                owner: this,
                x: posX,
                y: posY,
                angle: angle,
                damage: damage,
                dmgType: 'physical',
                range: range,
                width: width,
                spritePath: spritePath,
                scale: 3.2,
                damageOnFrame: 3,
                attackType: 'skill',
                onHitExtra: (enemy) => {
                    if (this.inDeathState && enemy.dead) {
                        this.deathStateKills++;
                    }
                }
            }));
        }
    }

    // === CHIÊU 2 ===
    castSkill2(targetAngle) {
        if (this.cooldowns['2'] > 0 || this.isResting || this.isReviving || this.s2Channeling || this.s3DebuffTimer > 0) return;

        if (this.currentWeapon === 'bow') {
            // CUNG CHIÊU 2: Bắn tối đa 5 mũi tên/đầu lâu tới 5 mục tiêu gần nhất trong 1/3 tầm đánh
            this.cooldowns['2'] = 8.0 * (1 - Math.min(0.4, this.stats.cdr));
            let maxRange = this.bowRange / 3;

            // Tìm 5 kẻ địch gần nhất trong tầm 1/3
            let validEnemies = gameState.enemies.filter(e => !e.dead && Math.hypot(e.x - this.x, e.y - this.y) <= maxRange);
            validEnemies.sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y));
            let targetGroup = validEnemies.slice(0, 5);

            if (targetGroup.length > 0) {
                targetGroup.forEach(enemy => {
                    let ang = Math.atan2(enemy.y - this.y, enemy.x - this.x);
                    this.fireBowProjectile(ang, this.stats.ad * 1.0, this.inDeathState);
                });
            } else {
                // Nếu không có mục tiêu, bắn 1 phát theo hướng chỉ định
                this.fireBowProjectile(targetAngle !== undefined ? targetAngle : this.angle, this.stats.ad * 1.0, this.inDeathState);
            }

            // Khựng 0.25s
            this.bowS2StunTimer = 0.25;

            // Xác định hướng di chuyển hiện tại để lướt
            let mx = 0, my = 0;
            if (this.id === 1) {
                if (gameState.keys['w']) my -= 1;
                if (gameState.keys['s']) my += 1;
                if (gameState.keys['a']) mx -= 1;
                if (gameState.keys['d']) mx += 1;
            } else {
                if (gameState.keys['arrowup']) my -= 1;
                if (gameState.keys['arrowdown']) my += 1;
                if (gameState.keys['arrowleft']) mx -= 1;
                if (gameState.keys['arrowright']) mx += 1;
            }

            if (mx === 0 && my === 0) {
                // Nếu không nhấn phím di chuyển, lướt theo hướng mặt
                this.bowS2DashVx = Math.cos(this.angle);
                this.bowS2DashVy = Math.sin(this.angle);
            } else {
                let len = Math.hypot(mx, my);
                this.bowS2DashVx = mx / len;
                this.bowS2DashVy = my / len;
            }
        } else {
            // KIẾM CHIÊU 2
            this.cooldowns['2'] = 8.0 * (1 - Math.min(0.4, this.stats.cdr));
            this.s2Channeling = true;
            this.s2Timer = 1.2;
            this.s2LockedAngle = targetAngle !== undefined ? targetAngle : this.angle;
            this.s2ShotsFired = 0;
        }
    }

// Tính toán tọa độ rơi thời gian thực: P1 theo chuột, P2 tự động aim quái gần nhất
    calculateRealtimeRainTarget() {
        let tX = this.x;
        let tY = this.y;

        if (this.id === 1) {
            // PLAYER 1: Luôn bám sát vị trí con trỏ chuột hiện tại
            let rawX = (typeof gameState !== 'undefined' && gameState.mouse) ? gameState.mouse.worldX : this.x;
            let rawY = (typeof gameState !== 'undefined' && gameState.mouse) ? gameState.mouse.worldY : this.y;

            let dist = Math.hypot(rawX - this.x, rawY - this.y);
            if (dist > this.bowRange) {
                let ang = Math.atan2(rawY - this.y, rawX - this.x);
                tX = this.x + Math.cos(ang) * this.bowRange;
                tY = this.y + Math.sin(ang) * this.bowRange;
            } else {
                tX = rawX;
                tY = rawY;
            }
        } else {
            // PLAYER 2: Tự động aim quái gần nhất trong tầm đánh thường tại thời điểm bắn
            let nearest = (typeof getNearestMonster === 'function') ? getNearestMonster(this) : null;
            if (nearest && Math.hypot(nearest.x - this.x, nearest.y - this.y) <= this.bowRange) {
                tX = nearest.x;
                tY = nearest.y;
            } else {
                // Không có quái trong tầm -> Bắn theo hướng nhân vật đang quay mặt
                tX = this.x + Math.cos(this.angle) * (this.bowRange * 0.75);
                tY = this.y + Math.sin(this.angle) * (this.bowRange * 0.75);
            }
        }

        return { x: tX, y: tY };
    }

    // === CHIÊU 3 ===
    castSkill3(targetAngle) {
        if (this.cooldowns['3'] > 0 || this.isResting || this.isReviving || this.s3DebuffTimer > 0) return;

        if (this.currentWeapon === 'bow') {
            // CUNG CHIÊU 3: Nhảy lên cao vào TRẠNG THÁI LƠ LỬNG trong 3s
            this.cooldowns['3'] = 22.0 * (1 - Math.min(0.4, this.stats.cdr));
            this.isLevitating = true;
            this.levitateTimer = this.levitateDuration;
            this.levitateHeight = 0;
            this.rainTimer = 0;
            this.rainShotsFired = 0;

            // Bắn ngay phát đầu tiên theo vị trí nhắm hiện tại
            let aimPos = this.calculateRealtimeRainTarget();
            this.rainShotsFired = 1;
            this.fireRainArrow(aimPos.x, aimPos.y);

        } else {
            // KIẾM CHIÊU 3
            this.cooldowns['3'] = this.maxCooldowns['3'] * (1 - Math.min(0.4, this.stats.cdr));
            this.s3DebuffTimer = 3.0;
            this.s3HealTickTimer = 0;
        }
    }

    fireRainArrow(targetX, targetY) {
        // Tên bay từ vị trí trên không xuống vị trí target với độ lệch nhẹ ngẫu nhiên
        let spreadX = targetX + (Math.random() - 0.5) * 40;
        let spreadY = targetY + (Math.random() - 0.5) * 40;

        this.rainArrowsList.push(new MagaRainArrow({
            owner: this,
            startX: this.x,
            startY: this.y - this.levitateHeight,
            targetX: spreadX,
            targetY: spreadY,
            isDeath: this.inDeathState,
            damage: this.stats.ad * 0.45
        }));
    }

    draw(ctx) {
        if (this.dead) return;

        // Vẽ các vùng cảnh báo & tên rơi chiêu 3
        this.rainArrowsList.forEach(ra => ra.draw(ctx));

        // Nếu đang trong thời gian chờ hồi sinh 2.5s
        if (this.isReviving) {
            ctx.save();
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.01) * 0.4;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = "#e74c3c";
            ctx.fill();
            ctx.restore();
            return;
        }

        // KHI BAY (LƠ LỬNG): VẼ BÓNG DƯỚI ĐẤT ĐỂ NGƯỜI CHƠI BIẾT VỊ TRÍ VÀ HITBOX THỰC TẾ
        if (this.isLevitating) {
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(this.x, this.y, this.radius * 1.1, this.radius * 0.55, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.fill();
            ctx.restore();
        }

        // Tọa độ vẽ người (nhảy lên cao theo trục Y nếu đang lơ lửng)
        let drawY = this.y - this.levitateHeight;

        // Hiệu ứng Aurora khi ở Trạng thái Tử và đang di chuyển
        if (this.inDeathState) {
            let isMoving = false;
            if (this.id === 1) {
                isMoving = gameState.keys['w'] || gameState.keys['s'] || gameState.keys['a'] || gameState.keys['d'];
            } else {
                isMoving = gameState.keys['arrowup'] || gameState.keys['arrowdown'] || gameState.keys['arrowleft'] || gameState.keys['arrowright'];
            }

            if (isMoving && typeof getValidFrames === 'function') {
                const auroraFrames = getValidFrames('Ambient/Aurora');
                if (auroraFrames.length > 0) {
                    let frameIdx = Math.floor((Date.now() / 1000) * 20) % auroraFrames.length;
                    let aImg = auroraFrames[frameIdx];
                    if (aImg && aImg.naturalWidth > 0) {
                        ctx.save();
                        ctx.translate(this.x, drawY);
                        let scaleX = this.facingLeft ? -1.35 : 1.35;
                        ctx.scale(scaleX, 1.35);
                        let w = aImg.naturalWidth;
                        let h = aImg.naturalHeight;
                        ctx.drawImage(aImg, -w / 2, -h / 2, w, h);
                        ctx.restore();
                    }
                }
            }
        }

        // Thân tướng
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, drawY, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.inDeathState ? '#800000' : this.color;
        ctx.shadowColor = this.inDeathState ? '#ff0000' : this.color;
        ctx.shadowBlur = this.inDeathState ? 16 : 8;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // Mũi nhọn chỉ hướng
        let curAngle = this.s2Channeling ? this.s2LockedAngle : this.angle;
        ctx.save();
        ctx.translate(this.x, drawY);
        ctx.rotate(curAngle);
        ctx.fillStyle = this.inDeathState ? '#ff1744' : (this.currentWeapon === 'bow' ? '#f39c12' : '#bdc3c7');
        ctx.beginPath();
        ctx.moveTo(this.radius + 14, 0);
        ctx.lineTo(this.radius - 2, -4);
        ctx.lineTo(this.radius + 4, 0);
        ctx.lineTo(this.radius - 2, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

// Hàm kiểm tra sát thương đặc biệt bỏ qua trạng thái bay
function extraConfigBypass(source) {
    return source === 'dot' || source === 'bypass_airborne';
}

// Hook khởi tạo hệ thống mảng slashes vào gameState
if (typeof gameState !== 'undefined') {
    gameState.magaSlashes = [];
}

// === XỬ LÝ LỆNH CODE TEST ===
function applyMagadotCodeTest(cmd) {
    if (!cmd) return false;
    let clean = cmd.trim().toLowerCase();

    if (clean.startsWith('/test magadot')) {
        let isPractice = clean.includes('test') && !clean.endsWith('sur');
        let selectedMode = isPractice ? 'practice' : 'survival';

        let modeSelect = document.getElementById("gameModeSelect");
        if (modeSelect) modeSelect.value = selectedMode;

        if (typeof pickHero === 'function') {
            pickHero(1, 'magadot');
        }

        let selectScreen = document.getElementById("selectScreen");
        if (selectScreen) selectScreen.style.display = "none";
        let hud = document.getElementById("hud");
        if (hud) hud.style.display = "block";

        if (typeof initSurvivalMatch === 'function') {
            initSurvivalMatch();
        }

        setTimeout(() => {
            if (gameState && gameState.players) {
                gameState.players.forEach(p => {
                    if (p && p.heroType === 'magadot') {
                        p.isGodmodeTest = true;
                        p.enterDeathState();
                    }
                });
            }
        }, 150);
        return true;
    }
    return false;
}
window.applyMagadotCodeTest = applyMagadotCodeTest;