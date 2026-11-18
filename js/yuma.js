// ==========================================================================
// FILE: js/yuma.js - TƯỚNG YUMAKAI (PHI TIÊU / CẤU RỈA)
// ==========================================================================

(function () {
    // Tải trước hoạt ảnh từ assets/Frames
    if (typeof getAnimFrames === 'function') {
        getAnimFrames('Projectiles/Spear Throw', 11);
        getAnimFrames('Projectiles/Shuriken', 11);
        getAnimFrames('Hit Sparks/Pierce Spark', 6);
        getAnimFrames('Magic/Teleport', 10);
    }

    // Tải sprite sheet cho Chiêu 2 & icon nội tại
    const yumaStartImg = new Image();
    yumaStartImg.src = 'assets/Frames/Projectiles/start.png';

    const yumaProImg = new Image();
    yumaProImg.src = 'assets/Frames/Projectiles/pro.png';

    const yumaHitImg = new Image();
    yumaHitImg.src = 'assets/Frames/Projectiles/hit.png';

    const yumaPassiveIconImg = new Image();
    const yumaIconPaths = [
        'assets/Frames/icons.png',
        'assets/icons.png',
        'assets/icon/icons.png'
    ];
    let yumaIconPathIdx = 0;
    yumaPassiveIconImg.onerror = () => {
        yumaIconPathIdx++;
        if (yumaIconPathIdx < yumaIconPaths.length) {
            yumaPassiveIconImg.src = yumaIconPaths[yumaIconPathIdx];
        }
    };
    yumaPassiveIconImg.src = yumaIconPaths[0];

    // Vẽ frame theo đúng kích thước hitbox + 50% bù viền trong suốt
    function drawFittedFrame(ctx, img, x, y, hitboxSize, rotation = 0, originX = 0.5, originY = 0.5) {
        if (!img || !img.naturalWidth || !img.naturalHeight) return;
        const targetSize = hitboxSize * 1.5;
        const scale = targetSize / Math.max(img.naturalWidth, img.naturalHeight);
        const w = img.naturalWidth * scale;
        const h = img.naturalHeight * scale;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.drawImage(img, -w * originX, -h * originY, w, h);
        ctx.restore();
    }

    // Vẽ 1 frame cắt từ sprite sheet ngang (start.png / pro.png / hit.png)
    function drawSlicedSheetFrame(ctx, img, frameIdx, totalFrames, x, y, hitboxSize, rotation = 0) {
        if (!img || !img.complete || !img.naturalWidth || !img.naturalHeight) return;
        const idx = Math.max(0, Math.min(totalFrames - 1, frameIdx));
        const fw = img.naturalWidth / totalFrames;
        const fh = img.naturalHeight;
        const targetSize = hitboxSize * 1.5;
        const scale = targetSize / Math.max(fw, fh);
        const dw = fw * scale;
        const dh = fh * scale;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.drawImage(img, idx * fw, 0, fw, fh, -dw / 2, -dh / 2, dw, dh);
        ctx.restore();
    }

    // Hiệu ứng chạy sprite sheet cắt ngang 1 lần (start.png 2 frame, hit.png 7 frame)
    class YumaSlicedOnceEffect {
        constructor(img, totalFrames, x, y, hitboxSize, fps = 20, rotation = 0) {
            this.img = img;
            this.totalFrames = totalFrames;
            this.x = x;
            this.y = y;
            this.hitboxSize = hitboxSize;
            this.fps = fps;
            this.rotation = rotation;
            this.time = 0;
            this.dead = false;
        }

        update(dt) {
            this.time += dt;
            if (Math.floor(this.time * this.fps) >= this.totalFrames) {
                this.dead = true;
            }
        }

        draw(ctx) {
            const idx = Math.floor(this.time * this.fps);
            if (idx >= this.totalFrames) return;
            drawSlicedSheetFrame(ctx, this.img, idx, this.totalFrames, this.x, this.y, this.hitboxSize, this.rotation);
        }
    }

    // Hiệu ứng chạy khoảng frame cụ thể của một thư mục (Magic/Teleport 1-6 và 6-10)
    class YumaFrameRangeEffect {
        constructor(folderPath, startFrame1Based, endFrame1Based, x, y, hitboxSize, fps = 24, followTarget = null) {
            this.folderPath = folderPath;
            this.startIdx = startFrame1Based - 1;
            this.endIdx = endFrame1Based - 1;
            this.x = x;
            this.y = y;
            this.hitboxSize = hitboxSize;
            this.fps = fps;
            this.followTarget = followTarget;
            this.time = 0;
            this.dead = false;
            if (typeof getAnimFrames === 'function') getAnimFrames(folderPath, 12);
        }

        update(dt) {
            this.time += dt;
            if (this.followTarget && !this.followTarget.dead) {
                this.x = this.followTarget.x;
                this.y = this.followTarget.y;
            }
            const total = this.endIdx - this.startIdx + 1;
            if (Math.floor(this.time * this.fps) >= total) {
                this.dead = true;
            }
        }

        draw(ctx) {
            if (typeof getValidFrames !== 'function') return;
            const valid = getValidFrames(this.folderPath);
            if (valid.length === 0) return;

            const step = Math.floor(this.time * this.fps);
            const total = this.endIdx - this.startIdx + 1;
            if (step >= total) return;

            const idx = Math.min(valid.length - 1, this.startIdx + step);
            drawFittedFrame(ctx, valid[idx], this.x, this.y, this.hitboxSize, 0);
        }
    }

    // Hiệu ứng hit spark phù hợp hitbox
    function spawnPierceSpark(x, y, hitboxSize) {
        if (typeof getValidFrames !== 'function') return;
        const frames = getValidFrames('Hit Sparks/Pierce Spark');
        const fx = {
            x, y,
            hitboxSize,
            time: 0,
            fps: 24,
            rotation: Math.random() * Math.PI * 2,
            dead: false,
            update(dt) {
                this.time += dt;
                const valid = getValidFrames('Hit Sparks/Pierce Spark');
                if (valid.length > 0 && Math.floor(this.time * this.fps) >= valid.length) {
                    this.dead = true;
                } else if (this.time > 0.4) {
                    this.dead = true;
                }
            },
            draw(ctx) {
                const valid = getValidFrames('Hit Sparks/Pierce Spark');
                if (valid.length === 0) return;
                const idx = Math.floor(this.time * this.fps);
                if (idx >= valid.length) return;
                drawFittedFrame(ctx, valid[idx], this.x, this.y, this.hitboxSize, this.rotation);
            }
        };
        if (frames.length === 0 && typeof getAnimFrames === 'function') {
            getAnimFrames('Hit Sparks/Pierce Spark', 6);
        }
        gameState.animatedEffects.push(fx);
    }

    // Đạn đánh thường (Projectiles/Spear Throw/frame001->011.png lặp)
    class YumaSpearProjectile {
        constructor(owner, x, y, angle, isCrit) {
            this.owner = owner;
            this.attackType = 'basic_attack';
            this.x = x;
            this.y = y;
            this.angle = angle;
            this.vx = Math.cos(angle);
            this.vy = Math.sin(angle);
            this.radius = 11;
            this.speed = 15;
            this.range = 500;
            this.dist = 0;
            this.isCrit = isCrit;
            this.animTime = 0;
            this.dead = false;
        }

        update(dt) {
            this.animTime += dt;
            const dx = this.vx * this.speed * dt * 60;
            const dy = this.vy * this.speed * dt * 60;
            this.x += dx;
            this.y += dy;
            this.dist += Math.hypot(dx, dy);
            if (this.dist >= this.range) {
                this.dead = true;
                return;
            }

            for (let enemy of gameState.enemies) {
                if (enemy.dead) continue;
                if (Math.hypot(this.x - enemy.x, this.y - enemy.y) <= this.radius + enemy.radius) {
                    let dmg = (this.owner.stats.ad * 0.50) + (enemy.stats.maxHp * 0.01);
                    if (this.isCrit) {
                        dmg *= (2.0 + (this.owner.stats.critDamage || 0) / 100);
                    }
                    enemy.takeDamage(dmg, 'physical', this.owner, this.isCrit, 'basic_attack');
                    if (typeof processItemOnHitPassives === 'function') {
                        processItemOnHitPassives(this.owner, enemy, this);
                    }
                    this.owner.addPassivePoints(1);
                    spawnPierceSpark(enemy.x, enemy.y, Math.max(this.radius * 2, enemy.radius * 2));
                    this.dead = true;
                    break;
                }
            }
        }

        draw(ctx) {
            if (typeof getValidFrames !== 'function') return;
            const valid = getValidFrames('Projectiles/Spear Throw');
            if (valid.length === 0) return;
            const idx = Math.floor(this.animTime * 22) % valid.length;
            drawFittedFrame(ctx, valid[idx], this.x, this.y, this.radius * 2, this.angle);
        }
    }

    // Hiệu ứng phi tiêu nội tại (chỉ làm effect bay thẳng theo hướng bắn)
    class YumaShurikenVisual {
        constructor(x, y, angle, maxDist, hitboxWidth) {
            this.x = x;
            this.y = y;
            this.angle = angle;
            this.vx = Math.cos(angle);
            this.vy = Math.sin(angle);
            this.speed = 24;
            this.maxDist = maxDist;
            this.hitboxWidth = hitboxWidth;
            this.dist = 0;
            this.animTime = 0;
            this.dead = false;
        }

        update(dt) {
            this.animTime += dt;
            const step = this.speed * dt * 60;
            this.x += this.vx * step;
            this.y += this.vy * step;
            this.dist += step;
            if (this.dist >= this.maxDist) {
                this.dead = true;
            }
        }

        draw(ctx) {
            if (typeof getValidFrames !== 'function') return;
            const valid = getValidFrames('Projectiles/Shuriken');
            if (valid.length === 0) return;
            const idx = Math.floor(this.animTime * 24) % valid.length;
            drawFittedFrame(ctx, valid[idx], this.x, this.y, this.hitboxWidth, this.angle);
        }
    }

    // Chiêu 1: Phóng loạt đạn lên trên đầu rồi rơi tập trung thành vùng tròn trong 0.5s
    class YumaSkill1VolleyEffect {
        constructor(owner, startX, startY, targetX, targetY) {
            this.owner = owner;
            this.startX = startX;
            this.startY = startY;
            this.tx = targetX;
            this.ty = targetY;
            this.aoeRadius = 110;
            this.duration = 0.5;
            this.splitTime = 0.22;
            this.time = 0;
            this.triggered = false;
            this.dead = false;

            this.spears = [];
            const count = 9;
            for (let i = 0; i < count; i++) {
                const a = Math.random() * Math.PI * 2;
                const r = Math.sqrt(Math.random()) * (this.aoeRadius * 0.85);
                this.spears.push({
                    peakX: startX + (Math.random() - 0.5) * 44,
                    peakY: startY - 95 - Math.random() * 40,
                    landX: targetX + Math.cos(a) * r,
                    landY: targetY + Math.sin(a) * r,
                    curX: startX,
                    curY: startY,
                    rot: -Math.PI / 2,
                    animOffset: Math.random() * 0.5
                });
            }
        }

        update(dt) {
            this.time += dt;
            const t = Math.min(this.duration, this.time);

            for (let sp of this.spears) {
                if (t <= this.splitTime) {
                    const p = t / this.splitTime;
                    const ease = 1 - Math.pow(1 - p, 2);
                    sp.curX = this.startX + (sp.peakX - this.startX) * ease;
                    sp.curY = this.startY + (sp.peakY - this.startY) * ease;
                    sp.rot = Math.atan2(sp.peakY - this.startY, sp.peakX - this.startX);
                } else {
                    const p = (t - this.splitTime) / (this.duration - this.splitTime);
                    const ease = p * p;
                    sp.curX = sp.peakX + (sp.landX - sp.peakX) * ease;
                    sp.curY = sp.peakY + (sp.landY - sp.peakY) * ease;
                    sp.rot = Math.atan2(sp.landY - sp.peakY, sp.landX - sp.peakX);
                }
            }

            if (this.time >= this.duration && !this.triggered) {
                this.triggered = true;
                this.onLand();
                this.dead = true;
            }
        }

        onLand() {
            const dmg = this.owner.stats.ad * 1.0 + this.owner.stats.ap * 0.10;
            for (let sp of this.spears) {
                spawnPierceSpark(sp.landX, sp.landY, 26);
            }

            for (let enemy of gameState.enemies) {
                if (enemy.dead) continue;
                if (Math.hypot(enemy.x - this.tx, enemy.y - this.ty) <= this.aoeRadius + enemy.radius) {
                    enemy.takeDamage(dmg, 'physical', this.owner, false, 'skill');
                    enemy.applySlow(0.50, 1.0);
                    if (typeof processItemOnHitPassives === 'function') {
                        processItemOnHitPassives(this.owner, enemy, { attackType: 'skill' });
                    }
                    spawnPierceSpark(enemy.x, enemy.y, enemy.radius * 2);
                }
            }
        }

        draw(ctx) {
            // Vùng tròn chỉ định nơi đạn rơi xuống
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.tx, this.ty, this.aoeRadius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 71, 87, 0.14)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 71, 87, 0.7)';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();

            if (typeof getValidFrames !== 'function') return;
            const valid = getValidFrames('Projectiles/Spear Throw');
            if (valid.length === 0) return;

            for (let sp of this.spears) {
                const idx = Math.floor((this.time + sp.animOffset) * 22) % valid.length;
                drawFittedFrame(ctx, valid[idx], sp.curX, sp.curY, 22, sp.rot);
            }
        }
    }

    // Đạn Chiêu 2 (pro.png 8 frame lặp, trúng đòn hit.png, đẩy lùi + choáng nếu đứng gần)
    class YumaSkill2Projectile {
        constructor(owner, castX, castY, angle) {
            this.owner = owner;
            this.attackType = 'skill';
            this.castX = castX;
            this.castY = castY;
            this.x = castX + Math.cos(angle) * 24;
            this.y = castY + Math.sin(angle) * 24;
            this.angle = angle;
            this.vx = Math.cos(angle);
            this.vy = Math.sin(angle);
            this.radius = 22;
            this.speed = 13;
            this.range = 650;
            this.explosionRadius = 85;
            this.closeRangeThreshold = 200;
            this.dist = 0;
            this.animTime = 0;
            this.dead = false;
        }

        update(dt) {
            this.animTime += dt;
            const dx = this.vx * this.speed * dt * 60;
            const dy = this.vy * this.speed * dt * 60;
            this.x += dx;
            this.y += dy;
            this.dist += Math.hypot(dx, dy);

            if (this.dist >= this.range) {
                this.dead = true;
                return;
            }

            for (let enemy of gameState.enemies) {
                if (enemy.dead) continue;
                if (Math.hypot(this.x - enemy.x, this.y - enemy.y) <= this.radius + enemy.radius) {
                    this.onImpact(enemy);
                    this.dead = true;
                    break;
                }
            }
        }

        onImpact(primaryTarget) {
            const directDmg = this.owner.stats.ad * 2.0;
            const aoeMagicDmg = this.owner.stats.ad * 0.50;
            const isCloseRange = (this.dist <= this.closeRangeThreshold);

            primaryTarget.takeDamage(directDmg, 'physical', this.owner, false, 'skill');
            if (typeof processItemOnHitPassives === 'function') {
                processItemOnHitPassives(this.owner, primaryTarget, this);
            }

            // Nổ hiệu ứng hit.png (224x32 -> 7 frame 32x32)
            gameState.animatedEffects.push(
                new YumaSlicedOnceEffect(yumaHitImg, 7, this.x, this.y, this.explosionRadius * 2, 22, this.angle)
            );

            for (let sub of gameState.enemies) {
                if (sub.dead) continue;
                const dToExplosion = Math.hypot(sub.x - this.x, sub.y - this.y);
                const inExplosion = (dToExplosion <= this.explosionRadius + sub.radius);

                if (sub !== primaryTarget && inExplosion) {
                    sub.takeDamage(aoeMagicDmg, 'magic', this.owner, false, 'skill');
                }

                // Quái đứng gần mà trúng đòn sẽ bị đẩy mạnh ra xa và choáng 0.5s
                if (isCloseRange && (sub === primaryTarget || inExplosion)) {
                    sub.stunTimer = Math.max(sub.stunTimer || 0, 0.5);
                    let pushAngle = Math.atan2(sub.y - this.castY, sub.x - this.castX);
                    if (Math.hypot(sub.x - this.castX, sub.y - this.castY) < 5) {
                        pushAngle = this.angle;
                    }
                    this.owner.applyKnockback(sub, pushAngle, 180, 0.16);
                }
            }
        }

        draw(ctx) {
            const frameIdx = Math.floor(this.animTime * 20) % 8;
            drawSlicedSheetFrame(ctx, yumaProImg, frameIdx, 8, this.x, this.y, this.radius * 2, this.angle);
        }
    }

    // Chiêu 3: Dịch chuyển toàn bộ quái trong phạm vi gần bản thân tới vị trí chỉ định
    class YumaSkill3TeleportEffect {
        constructor(owner, tx, ty, targets) {
            this.owner = owner;
            this.tx = tx;
            this.ty = ty;
            this.items = targets.map(e => {
                const dx = (e.x - owner.x) * 0.45;
                const dy = (e.y - owner.y) * 0.45;
                const destX = Math.max(30, Math.min(WORLD_WIDTH - 30, tx + dx));
                const destY = Math.max(30, Math.min(WORLD_HEIGHT - 30, ty + dy));

                // Hiệu ứng quái dịch chuyển: Magic/Teleport/frame001-006.png
                gameState.animatedEffects.push(
                    new YumaFrameRangeEffect('Magic/Teleport', 1, 6, e.x, e.y, e.radius * 2, 24, e)
                );

                return { enemy: e, destX, destY };
            });

            this.delay = 6 / 24; // 0.25s khớp 6 frame đầu
            this.time = 0;
            this.dead = false;
        }

        update(dt) {
            this.time += dt;
            if (this.time >= this.delay) {
                for (let item of this.items) {
                    const e = item.enemy;
                    if (!e || e.dead) continue;
                    e.x = item.destX;
                    e.y = item.destY;
                    if (window.mapProps && typeof window.mapProps.resolveEntityCollision === 'function') {
                        window.mapProps.resolveEntityCollision(e);
                    }
                    // Hiệu ứng quái hoàn thành dịch chuyển: Magic/Teleport/frame006-010.png
                    gameState.animatedEffects.push(
                        new YumaFrameRangeEffect('Magic/Teleport', 6, 10, e.x, e.y, e.radius * 2, 24, e)
                    );
                }
                this.dead = true;
            }
        }

        draw() { }
    }

    // Lớp tướng Yumakai
    class Yumakai extends PlayerHero {
        constructor(id, x, y, extraConfig = {}) {
            super(id, x, y, {
                maxHp: 360,
                hpRegen: 2.8,
                maxMana: 750,
                manaRegen: 8,
                ad: 30,
                ap: 0,
                attackSpeed: 1.5,
                speed: 3.6,
                armor: 22,
                mr: 22,
                critRate: 0,
                ...extraConfig
            });

            this.heroType = 'yumakai';
            this.color = id === 1 ? '#ff4757' : '#ff6b81';

            this.maxCooldowns = { '1': 6.5, '2': 8.0, '3': 12.0 };
            this.manaCosts = { '1': 30, '2': 45, '3': 60 };

            this.passivePoints = 0;
            this.attackPauseTimer = 0;

            // Trạng thái xả 7 phi tiêu nội tại
            this.barrageActive = false;
            this.barrageAngle = 0;
            this.barrageTicksLeft = 0;
            this.barrageTickTimer = 0;
            this.barrageTickInterval = 0.1;

            // Danh sách đẩy lùi Chiêu 2
            this.knockbacks = [];
        }

        addPassivePoints(amount) {
            if (this.passivePoints >= 4) return;
            this.passivePoints = Math.min(4, this.passivePoints + amount);
        }

        applyKnockback(enemy, angle, distance, duration) {
            this.knockbacks.push({
                enemy,
                vx: Math.cos(angle) * (distance / duration),
                vy: Math.sin(angle) * (distance / duration),
                timer: duration
            });
        }

        getActualSpeed() {
            if (this.attackPauseTimer > 0 || this.barrageActive) return 0;
            return this.stats.speed;
        }

        update(dt) {
            super.update(dt);

            if (this.attackPauseTimer > 0) {
                this.attackPauseTimer = Math.max(0, this.attackPauseTimer - dt);
            }

            // Cập nhật đẩy lùi
            for (let i = this.knockbacks.length - 1; i >= 0; i--) {
                const kb = this.knockbacks[i];
                kb.timer -= dt;
                if (!kb.enemy || kb.enemy.dead || kb.timer <= 0) {
                    this.knockbacks.splice(i, 1);
                    continue;
                }
                kb.enemy.x = Math.max(25, Math.min(WORLD_WIDTH - 25, kb.enemy.x + kb.vx * dt));
                kb.enemy.y = Math.max(25, Math.min(WORLD_HEIGHT - 25, kb.enemy.y + kb.vy * dt));
                if (window.mapProps && typeof window.mapProps.resolveEntityCollision === 'function') {
                    window.mapProps.resolveEntityCollision(kb.enemy);
                }
            }

            // Cập nhật 7 lần xả phi tiêu nội tại
            if (this.barrageActive) {
                if (this.dead || this.stunTimer > 0) {
                    this.barrageActive = false;
                    return;
                }
                this.barrageTickTimer -= dt;
                while (this.barrageTickTimer <= 0 && this.barrageTicksLeft > 0) {
                    this.barrageTickTimer += this.barrageTickInterval;
                    this.barrageTicksLeft--;
                    this.executeBarrageTick();
                }
                if (this.barrageTicksLeft <= 0) {
                    this.barrageActive = false;
                }
            }
        }

        castBasicAttack(targetAngle) {
            if (this.attackCooldown > 0 || this.stunTimer > 0 || this.isResting || this.barrageActive) return;
            this.angle = targetAngle;

            if (window.mapProps && window.mapProps.isEntityInBush(this)) {
                if (typeof onPlayerGunshotInBush === 'function') {
                    onPlayerGunshotInBush(this);
                }
            }

            // Đủ 4 điểm nội tại -> kích hoạt Đánh thường nội tại
            if (this.passivePoints >= 4) {
                this.passivePoints = 0;
                this.startEmpoweredBarrage(targetAngle);
                return;
            }

            // Đánh thường
            this.attackCooldown = this.stats.attackSpeed;
            this.attackPauseTimer = Math.max(0.05, Math.min(0.24, this.stats.attackSpeed * 0.18));

            const isCrit = (Math.random() * 100 < this.stats.critRate);
            const sx = this.x + Math.cos(targetAngle) * 18;
            const sy = this.y + Math.sin(targetAngle) * 18;

            gameState.projectiles.push(new YumaSpearProjectile(this, sx, sy, targetAngle, isCrit));
        }

        startEmpoweredBarrage(targetAngle) {
            const totalDuration = Math.max(0.25, Math.min(0.7, 0.7 * (this.stats.attackSpeed / 1.05)));
            this.barrageActive = true;
            this.barrageAngle = targetAngle;
            this.barrageTicksLeft = 7;
            this.barrageTickInterval = totalDuration / 7;
            this.barrageTickTimer = 0;
            this.attackCooldown = Math.max(this.stats.attackSpeed, totalDuration);
        }

        executeBarrageTick() {
            const length = 560;
            const halfWidth = 20;
            const fx = Math.cos(this.barrageAngle);
            const fy = Math.sin(this.barrageAngle);

            // Bắn 1 phi tiêu hiệu ứng (lệch nhau một chút trên 1 đường thẳng)
            const perpJitter = (Math.random() - 0.5) * 14;
            const angleJitter = (Math.random() - 0.5) * 0.04;
            const sx = this.x + fx * 18 + (-fy) * perpJitter;
            const sy = this.y + fy * 18 + fx * perpJitter;
            gameState.animatedEffects.push(
                new YumaShurikenVisual(sx, sy, this.barrageAngle + angleJitter, length, halfWidth * 2)
            );

            // Gây dame lên toàn bộ quái trong hitbox thẳng dài: mỗi lần (20% AD + 20% AP + 0.3% HP quái)
            for (let enemy of gameState.enemies) {
                if (enemy.dead) continue;
                const toX = enemy.x - this.x;
                const toY = enemy.y - this.y;
                const proj = toX * fx + toY * fy;
                if (proj >= -enemy.radius && proj <= length + enemy.radius) {
                    const perpDist = Math.abs(toX * (-fy) + toY * fx);
                    if (perpDist <= halfWidth + enemy.radius) {
                        const isCrit = (Math.random() * 100 < this.stats.critRate);
                        let dmg = (this.stats.ad * 0.20) + (this.stats.ap * 0.20) + (enemy.stats.maxHp * 0.003);
                        if (isCrit) {
                            dmg *= (2.0 + (this.stats.critDamage || 0) / 100);
                        }
                        enemy.takeDamage(dmg, 'physical', this, isCrit, 'basic_attack');
                        if (typeof processItemOnHitPassives === 'function') {
                            processItemOnHitPassives(this, enemy, { attackType: 'basic_attack' });
                        }
                        spawnPierceSpark(enemy.x, enemy.y, Math.max(24, enemy.radius * 2));
                    }
                }
            }
        }

        resolveTargetPoint(targetAngle, maxRange, defaultDist = 300) {
            let tx, ty;
            if (this.id === 1 && gameState.mouse) {
                tx = gameState.mouse.worldX;
                ty = gameState.mouse.worldY;
                const d = Math.hypot(tx - this.x, ty - this.y);
                if (d > maxRange && d > 0.001) {
                    const a = Math.atan2(ty - this.y, tx - this.x);
                    tx = this.x + Math.cos(a) * maxRange;
                    ty = this.y + Math.sin(a) * maxRange;
                }
            } else {
                const nearest = (typeof getNearestMonster === 'function') ? getNearestMonster(this) : null;
                if (nearest) {
                    const d = Math.hypot(nearest.x - this.x, nearest.y - this.y);
                    const clampD = Math.min(maxRange, d);
                    const a = Math.atan2(nearest.y - this.y, nearest.x - this.x);
                    tx = this.x + Math.cos(a) * clampD;
                    ty = this.y + Math.sin(a) * clampD;
                } else {
                    const a = targetAngle !== undefined ? targetAngle : this.angle;
                    tx = this.x + Math.cos(a) * Math.min(maxRange, defaultDist);
                    ty = this.y + Math.sin(a) * Math.min(maxRange, defaultDist);
                }
            }
            tx = Math.max(40, Math.min(WORLD_WIDTH - 40, tx));
            ty = Math.max(40, Math.min(WORLD_HEIGHT - 40, ty));
            return { x: tx, y: ty };
        }

        // Chiêu 1
        castSkill1(targetAngle) {
            if (this.cooldowns['1'] > 0 || this.stats.mana < this.manaCosts['1'] || this.isResting || this.barrageActive) return;
            this.stats.mana -= this.manaCosts['1'];
            this.cooldowns['1'] = this.maxCooldowns['1'] * (1 - Math.min(0.4, this.stats.cdr));

            const pt = this.resolveTargetPoint(targetAngle, 520, 300);
            this.angle = Math.atan2(pt.y - this.y, pt.x - this.x);
            this.addPassivePoints(4);

            gameState.animatedEffects.push(
                new YumaSkill1VolleyEffect(this, this.x, this.y, pt.x, pt.y)
            );
        }

        // Chiêu 2
        castSkill2(targetAngle) {
            if (this.cooldowns['2'] > 0 || this.stats.mana < this.manaCosts['2'] || this.isResting || this.barrageActive) return;
            this.stats.mana -= this.manaCosts['2'];
            this.cooldowns['2'] = this.maxCooldowns['2'] * (1 - Math.min(0.4, this.stats.cdr));

            if (targetAngle === undefined) {
                if (this.id === 1 && gameState.mouse) {
                    targetAngle = Math.atan2(gameState.mouse.worldY - this.y, gameState.mouse.worldX - this.x);
                } else {
                    const nearest = (typeof getNearestMonster === 'function') ? getNearestMonster(this) : null;
                    targetAngle = nearest ? Math.atan2(nearest.y - this.y, nearest.x - this.x) : this.angle;
                }
            }

            this.angle = targetAngle;
            this.addPassivePoints(4);

            // Hiệu ứng bắn 2 frame: Projectiles/start.png (64x32)
            const muzzleX = this.x + Math.cos(targetAngle) * 24;
            const muzzleY = this.y + Math.sin(targetAngle) * 24;
            gameState.animatedEffects.push(
                new YumaSlicedOnceEffect(yumaStartImg, 2, muzzleX, muzzleY, 44, 18, targetAngle)
            );

            // Viên đạn lớn: Projectiles/pro.png (256x32)
            gameState.projectiles.push(new YumaSkill2Projectile(this, this.x, this.y, targetAngle));
        }

        // Chiêu 3
        castSkill3(targetAngle) {
            if (this.cooldowns['3'] > 0 || this.stats.mana < this.manaCosts['3'] || this.isResting || this.barrageActive) return;
            this.stats.mana -= this.manaCosts['3'];
            this.cooldowns['3'] = this.maxCooldowns['3'] * (1 - Math.min(0.4, this.stats.cdr));

            let pt;
            if (this.id === 1 && gameState.mouse) {
                pt = this.resolveTargetPoint(targetAngle, 550, 280);
            } else {
                const a = targetAngle !== undefined ? targetAngle : this.angle;
                pt = {
                    x: Math.max(40, Math.min(WORLD_WIDTH - 40, this.x + Math.cos(a) * 280)),
                    y: Math.max(40, Math.min(WORLD_HEIGHT - 40, this.y + Math.sin(a) * 280))
                };
            }

            this.angle = Math.atan2(pt.y - this.y, pt.x - this.x);
            this.addPassivePoints(4);

            const pullRadius = 210;
            const targets = gameState.enemies.filter(e => !e.dead && Math.hypot(e.x - this.x, e.y - this.y) <= pullRadius);
            if (targets.length > 0) {
                gameState.animatedEffects.push(
                    new YumaSkill3TeleportEffect(this, pt.x, pt.y, targets)
                );
            }
        }

        draw(ctx) {
            if (this.dead) return;

            // Thân tướng
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.shadowColor = this.passivePoints >= 4 ? '#ffeb3b' : this.color;
            ctx.shadowBlur = this.passivePoints >= 4 ? 14 : 8;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();

            // Mũi phi tiêu định hướng
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.fillStyle = this.passivePoints >= 4 ? '#ffeb3b' : '#dfe4ea';
            ctx.beginPath();
            ctx.moveTo(this.radius + 11, 0);
            ctx.lineTo(this.radius - 1, -5);
            ctx.lineTo(this.radius + 2, 0);
            ctx.lineTo(this.radius - 1, 5);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // Hiển thị nội tại trên đầu: icons.png (32x32) cắt 4 góc dạng dấu +
            if (this.passivePoints > 0 && yumaPassiveIconImg.complete && yumaPassiveIconImg.naturalWidth > 0) {
                const sw = yumaPassiveIconImg.naturalWidth;
                const sh = yumaPassiveIconImg.naturalHeight;
                const hw = sw / 2;
                const hh = sh / 2;
                const drawHalf = 16; // 32x32 trên màn hình
                const cx = this.x;
                const cy = this.y - this.radius - 26;

                const quadrants = [
                    { sx: 0, sy: 0, dx: -drawHalf, dy: -drawHalf }, // Điểm 1: Góc trên trái
                    { sx: hw, sy: 0, dx: 0, dy: -drawHalf },         // Điểm 2: Góc trên phải
                    { sx: hw, sy: hh, dx: 0, dy: 0 },                // Điểm 3: Góc dưới phải
                    { sx: 0, sy: hh, dx: -drawHalf, dy: 0 }          // Điểm 4: Góc dưới trái
                ];

                ctx.save();
                for (let i = 0; i < Math.min(4, this.passivePoints); i++) {
                    const q = quadrants[i];
                    ctx.drawImage(
                        yumaPassiveIconImg,
                        q.sx, q.sy, hw, hh,
                        cx + q.dx, cy + q.dy, drawHalf, drawHalf
                    );
                }
                ctx.restore();
            }

            if (typeof this.drawBatPet === 'function') {
                this.drawBatPet(ctx);
            }
        }
    }

    window.Yumakai = Yumakai;

    // Hook spawnHeroInstance từ main.js để không cần sửa main.js
    const origSpawnHeroInstance = window.spawnHeroInstance;
    window.spawnHeroInstance = function (heroType, id, x, y, startGold) {
        if (heroType === 'yumakai') {
            return new Yumakai(id, x, y, { startingGold: startGold });
        }
        return origSpawnHeroInstance.apply(this, arguments);
    };
})();