// ==========================================================================
// FILE: js/green.js - TƯỚNG TAKING (QUỶ SONG KIẾM HẮC ÁM THEME XANH LỤC LINH HỒN)
// ==========================================================================

class Taking extends PlayerHero {
    constructor(id, x, y, extraConfig = {}) {
        super(id, x, y, {
            maxHp: 780,          // Máu chuẩn Đỡ Đòn (Tank cao)
            hpRegen: 5.0,        // Hồi phục cơ bản 5
            maxMana: 0,          // Không dùng mana
            manaRegen: 0,
            ad: 15,              // AD cơ bản 15
            ap: 0,
            attackSpeed: 1.5,    // Tốc đánh cơ bản 1.5s
            speed: 3.85,
            armor: 32,           // Giáp khá cao
            mr: 28,              // Kháng phép khá cao
            critRate: 0,
            critDamage: 0,
            ...extraConfig
        });

        this.heroType = 'taking';
        this.color = id === 1 ? '#1dd1a1' : '#10ac84';

        // Hệ thống combo đòn đánh thường (3 đợt)
        this.comboStage = 0;          // 0: Sẵn sàng đánh đợt 1, 1: Đang đợt 1, 2: Đang đợt 2, 3: Đang đợt 3
        this.isAttacking = false;
        this.attackAnimTime = 0;
        this.attackAngle = 0;
        this.postComboCooldown = 0;   // 1.5s chờ sau khi xong 3 đợt (không giảm theo AS)
        this.comboResetTimer = 0;     // Đếm 3s không đánh sẽ tự reset về đợt 1
        this.attackTriggeredFrames = new Set();

        // Chiêu 1: Curses Dark Nova & 3 Đạn Đầu Lâu
        this.maxCooldowns['1'] = 8.0;
        this.manaCosts['1'] = 0;
        this.s1ArmorBuffTimer = 0;     // Nhân đôi song giáp trong 5s

        // Chiêu 2: Lá chắn linh hồn máu ảo
        this.maxCooldowns['2'] = 10.0;
        this.manaCosts['2'] = 0;
        this.shield = 0;               // Máu ảo (trắng)
        this.maxShield = 0;
        this.shieldTimer = 0;          // Tồn tại trong 5s
        this.shieldAnimTime = 0;
        this.shieldTickTimer = 0;
        this.shieldShrinkTimer = 0;
        this.isShieldShrinking = false;

        // Chiêu 3: Hóa Linh Hồn & Bộc Phá Cường Hóa
        this.maxCooldowns['3'] = 16.0;
        this.manaCosts['3'] = 0;
        this.isGhost = false;          // Trạng thái linh hồn
        this.ghostTimer = 0;           // Tối đa 7.5s
        this.ghostAnimTime = 0;

        // Trạng thái vụ nổ Banshee Scream khi kết thúc chiêu 3
        this.isDetonating = false;     // Đang trong hoạt ảnh nổ (đứng yên & bất tử)
        this.detonateAnimTime = 0;
        this.detonateTriggered = false;

        this.s3BuffTimer = 0;          // Trạng thái cường hóa 5s sau khi nổ
        this.s3AuraAnimTime = 0;

        // Tải trước tài nguyên hoạt ảnh
        if (typeof getAnimFrames === 'function') {
            getAnimFrames('Slashes/Green/Slash3', 9);
            getAnimFrames('Slashes/Green/Slash', 9);
            getAnimFrames('Slashes/Green/Slash2', 9);
            getAnimFrames('Blood/Bloody Bite', 7);
            getAnimFrames('Curses/Dark Nova', 9);
            getAnimFrames('Curses/Skull Shot', 8);
            getAnimFrames('Curses/Skull Hit', 5);
            getAnimFrames('Spirits/Spirit Shield', 16);
            getAnimFrames('Spirits/Ghost Rise', 16);
            getAnimFrames('Spirits/Banshee Scream', 8);
            getAnimFrames('Fire/Green', 8);
        }
    }

    // Ghi đè lấy giáp & kháng phép khi có buff Chiêu 1
    getEffectiveArmor() {
        let arm = this.stats.armor;
        if (this.s1ArmorBuffTimer > 0) arm *= 2;
        return arm;
    }

    getEffectiveMr() {
        let mr = this.stats.mr;
        if (this.s1ArmorBuffTimer > 0) mr *= 2;
        return mr;
    }

    // Tốc độ di chuyển thực tế: đứng yên khi nổ, x2 khi hóa ma, giảm 50% khi đang chém
    getActualSpeed() {
        if (this.isDetonating) return 0; // Khi đang nổ không thể di chuyển
        let s = this.stats.speed;
        if (this.isGhost) s *= 2.0;
        if (this.isAttacking) s *= 0.50;
        return s;
    }

    // Xử lý nhận sát thương: Bất tử khi hóa ma HOẶC khi đang nổ Banshee Scream
    takeDamage(amount, type, attacker = null, isCrit = false, source = 'skill') {
        if (this.dead) return 0;
        if (this.isGhost || this.isDetonating) return 0;

        let finalDmg = amount;

        if (this.s3BuffTimer > 0) {
            finalDmg *= 0.50;
        }

        if (type !== 'true') {
            let effectiveDef = (type === 'physical') ? this.getEffectiveArmor() : this.getEffectiveMr();
            let rawPen = (attacker && attacker.getArmorPen) ? attacker.getArmorPen() : 0;
            let res = Math.max(0, effectiveDef - rawPen);
            finalDmg = finalDmg * (100 / (100 + res));
        }

        if (this.shield > 0) {
            if (this.shield >= finalDmg) {
                this.shield -= finalDmg;
                this.createDamagePopup(finalDmg, '#ecf0f1', isCrit);
                return finalDmg;
            } else {
                finalDmg -= this.shield;
                this.shield = 0;
            }
        }

        this.stats.hp = Math.max(0, this.stats.hp - finalDmg);

        let dmgColor = type === 'physical' ? '#ff3838' : (type === 'magic' ? '#c56cf0' : '#ffffff');
        this.createDamagePopup(finalDmg, dmgColor, isCrit);
        
        // Đã bỏ createImpactParticles

        if (this.stats.hp <= 0) {
            this.dead = true;
            this.onDeath(attacker);
        }
        return finalDmg;
    }

    createDamagePopup(dmg, color, isCrit) {
        let roundedDmg = Math.round(dmg);
        if (roundedDmg <= 0) return; // Không hiển thị nếu dame làm tròn <= 0

        while (gameState.damageTexts.length >= 25) gameState.damageTexts.shift();
        gameState.damageTexts.push({
            x: this.x + (Math.random() - 0.5) * 20,
            y: this.y - this.radius - 8,
            text: roundedDmg.toString(),
            color: color,
            isCrit: isCrit,
            life: 0.85
        });
    }
    update(dt) {
        super.update(dt);

        // Đếm lùi thời gian chờ sau combo 3 đợt
        if (this.postComboCooldown > 0) {
            this.postComboCooldown -= dt;
        }

        // Quá 3s không đánh thường sẽ tự reset combo về đợt 1
        if (this.comboStage > 0 && !this.isAttacking) {
            this.comboResetTimer += dt;
            if (this.comboResetTimer >= 3.0) {
                this.comboStage = 0;
                this.comboResetTimer = 0;
            }
        }
        if (this.s1ArmorBuffTimer > 0) {
            this.s1ArmorBuffTimer -= dt;
        }

        // Cập nhật hoạt ảnh đòn đánh thường
        if (this.isAttacking) {
            this.updateAttackCombo(dt);
        }

        // Cập nhật Chiêu 2 (Lá chắn máu ảo)
        if (this.shieldTimer > 0) {
            this.shieldAnimTime += dt;
            this.shieldTimer -= dt;

            // Gây (1% Max HP) + (2.5% HP đã mất) stp mỗi 0.3s lên quái xung quanh & hồi phục
            this.shieldTickTimer += dt;
            if (this.shieldTickTimer >= 0.3) {
                this.shieldTickTimer = 0;
                let lostHp = Math.max(0, this.stats.maxHp - this.stats.hp);
                let tickDmg = (this.stats.maxHp * 0.01) + (lostHp * 0.025);
                let totalDealt = 0;
                let hitRadius = 125;

                gameState.enemies.forEach(e => {
                    if (!e.dead && Math.hypot(e.x - this.x, e.y - this.y) <= hitRadius) {
                        let dealt = e.takeDamage(tickDmg, 'magic', this, false, 'skill');
                        totalDealt += dealt;
                    }
                });

                if (totalDealt > 0) {
                    this.heal(totalDealt);
                }
            }

            // Hết 5s lá chắn: Bắt đầu thu nhỏ biến mất và kích hoạt hồi chiêu
            if (this.shieldTimer <= 0) {
                this.shield = 0;
                this.isShieldShrinking = true;
                this.shieldShrinkTimer = 0.25;
                this.cooldowns['2'] = this.maxCooldowns['2'] * (1 - Math.min(0.4, this.stats.cdr));
            }
        }

        if (this.isShieldShrinking) {
            this.shieldShrinkTimer -= dt;
            if (this.shieldShrinkTimer <= 0) {
                this.isShieldShrinking = false;
            }
        }

        // Cập nhật Chiêu 3: Hóa ma
        if (this.isGhost) {
            this.ghostAnimTime += dt;
            this.ghostTimer -= dt;
            if (this.ghostTimer <= 0) {
                this.triggerDetonation();
            }
        }

        // Cập nhật Hoạt ảnh Vụ Nổ Banshee Scream (đứng yên & bất tử)
        if (this.isDetonating) {
            const fps = 14;
            this.detonateAnimTime += dt;
            let currentFrame = Math.floor(this.detonateAnimTime * fps) + 1; // 1 -> 8

            // Gây sát thương chuẩn xác ở Frame thứ 5 (25% Max HP sát thương phép)
            if (currentFrame >= 5 && !this.detonateTriggered) {
                this.detonateTriggered = true;
                let burstRadius = 185;
                let burstDmg = this.stats.maxHp * 0.25;

                gameState.enemies.forEach(e => {
                    if (!e.dead && Math.hypot(e.x - this.x, e.y - this.y) <= burstRadius) {
                        e.takeDamage(burstDmg, 'magic', this, false, 'skill');
                    }
                });
            }

            // Kết thúc hoạt ảnh nổ (8 frames): Kết thúc bất tử, chuyển sang trạng thái cường hóa 5s
            if (currentFrame > 8) {
                this.isDetonating = false;
                this.s3BuffTimer = 5.0;
                this.s3AuraAnimTime = 0;
            }
        }

        // Cập nhật trạng thái Cường Hóa 5s
        if (this.s3BuffTimer > 0) {
            this.s3BuffTimer -= dt;
            this.s3AuraAnimTime += dt;
        }

        // Đồng bộ tốc đánh cộng thêm từ chiêu 2 (+50%) và chiêu 3 (+100%)
        let bonusAs = (this.bonusStats.attackSpeedBonus || 0);
        if (this.shieldTimer > 0) bonusAs += 0.50;
        if (this.s3BuffTimer > 0) bonusAs += 1.00;
        this.attackSpeedBonus = bonusAs;
        this.stats.attackSpeed = this.baseStats.attackSpeed / (1 + this.attackSpeedBonus);
    }

    // Đòn đánh thường
    castBasicAttack(targetAngle) {
        if (this.stunTimer > 0 || this.isResting || this.isAttacking || this.postComboCooldown > 0 || this.isGhost || this.isDetonating) return;
        this.comboResetTimer = 0;
        this.isAttacking = true;
        this.attackAngle = targetAngle;
        this.angle = targetAngle;
        this.attackAnimTime = 0;
        this.attackTriggeredFrames.clear();
        this.comboStage++;
    }

    updateAttackCombo(dt) {
        const fps = 18;
        this.attackAnimTime += dt;
        let currentFrame = Math.floor(this.attackAnimTime * fps) + 1; // 1 -> 9
        let critMult = 2.0 + (this.stats.critDamage / 100);

        // ĐỢT 1: 100% AD stvl, có tỉ lệ chí mạng
        if (this.comboStage === 1) {
            if (currentFrame >= 4 && !this.attackTriggeredFrames.has(4)) {
                this.attackTriggeredFrames.add(4);
                let isCrit = (Math.random() * 100 < this.stats.critRate);
                let dmg = this.stats.ad * 1.0;
                if (isCrit) dmg *= critMult;
                this.executeCleaveDamage(dmg, isCrit, 0);
            }
            if (currentFrame >= 9) {
                this.isAttacking = false;
            }
        }
        // ĐỢT 2: 75% AD & 85% AD stvl, có tỉ lệ chí mạng
        else if (this.comboStage === 2) {
            if (currentFrame >= 2 && !this.attackTriggeredFrames.has(2)) {
                this.attackTriggeredFrames.add(2);
                let isCrit = (Math.random() * 100 < this.stats.critRate);
                let dmg = this.stats.ad * 0.75;
                if (isCrit) dmg *= critMult;
                this.executeCleaveDamage(dmg, isCrit, 0);
            }
            if (currentFrame >= 6 && !this.attackTriggeredFrames.has(6)) {
                this.attackTriggeredFrames.add(6);
                let isCrit = (Math.random() * 100 < this.stats.critRate);
                let dmg = this.stats.ad * 0.85;
                if (isCrit) dmg *= critMult;
                this.executeCleaveDamage(dmg, isCrit, 0);
            }
            if (currentFrame >= 9) {
                this.isAttacking = false;
            }
        }
        // ĐỢT 3: 125% AD stvl + chắc chắn 100% chí mạng + choáng 0.5s. Kết thúc chờ 1.5s (còn 0.5s nếu có Chiêu 3)
        else if (this.comboStage === 3) {
            if (currentFrame >= 3 && !this.attackTriggeredFrames.has(3)) {
                this.attackTriggeredFrames.add(3);
                let dmg = (this.stats.ad * 1.25) * critMult;
                this.executeCleaveDamage(dmg, true, 0.5);
            }
            if (currentFrame >= 9) {
                this.isAttacking = false;
                this.comboStage = 0;
                this.postComboCooldown = (this.s3BuffTimer > 0) ? 0.5 : 1.5;
            }
        }
    }

    executeCleaveDamage(dmg, isCrit, stunDuration) {
        let cleaveRange = 105;
        let arcHalf = Math.PI / 2.3;

        gameState.enemies.forEach(e => {
            if (e.dead) return;
            let dist = Math.hypot(e.x - this.x, e.y - this.y);
            if (dist <= cleaveRange + e.radius) {
                let toEnemyAngle = Math.atan2(e.y - this.y, e.x - this.x);
                let diff = Math.atan2(Math.sin(toEnemyAngle - this.attackAngle), Math.cos(toEnemyAngle - this.attackAngle));
                if (Math.abs(diff) <= arcHalf) {
                    e.takeDamage(dmg, 'physical', this, isCrit, 'basic_attack');
                    if (stunDuration > 0) {
                        e.stunTimer = Math.max(e.stunTimer, stunDuration);
                    }
                    processItemOnHitPassives(this, e, { attackType: 'basic_attack' });

                    // Hiệu ứng Blood/Bloody Bite tại vị trí quái khi chém trúng
                    if (typeof spawnAnimatedEffect === 'function') {
                        spawnAnimatedEffect('Blood/Bloody Bite', e.x, e.y, {
                            scale: 1.25,
                            fps: 20,
                            rotation: Math.random() * Math.PI * 2
                        });
                    }
                }
            }
        });
    }

    // CHIÊU 1: Curses/Dark Nova & Cầu Hắc Ám
    castSkill1(targetAngle) {
        if (this.cooldowns['1'] > 0 || this.isResting || this.isGhost || this.isDetonating) return;
        this.cooldowns['1'] = this.maxCooldowns['1'] * (1 - Math.min(0.4, this.stats.cdr));

        // Dark Nova đợt 1
        if (typeof spawnAnimatedEffect === 'function') {
            spawnAnimatedEffect('Curses/Dark Nova', this.x, this.y, {
                scale: 1.5,
                fps: 18,
                rotation: 0,
                onFrame: (frame) => {
                    // Đến frame 5: Chạy thêm 1 Dark Nova nữa và kích hoạt x2 song giáp trong 5s
                    if (frame === 5) {
                        this.s1ArmorBuffTimer = 5.0;
                        spawnAnimatedEffect('Curses/Dark Nova', this.x, this.y, {
                            scale: 1.8,
                            fps: 18,
                            rotation: Math.PI / 4
                        });
                    }
                }
            });
        }

        // Tìm 3 quái gần nhất và phóng 3 Cầu Hắc Ám
        let sortedEnemies = gameState.enemies
            .filter(e => !e.dead && (!e.monsterType || e.monsterType !== 'dummy' || !e.isInvisible))
            .sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y));

        let targets = sortedEnemies.slice(0, 3);
        let launchAngle = targetAngle !== undefined ? targetAngle : this.angle;

        for (let i = 0; i < 3; i++) {
            let t = targets[i] || null;
            let ang = t ? Math.atan2(t.y - this.y, t.x - this.x) : (launchAngle + (i - 1) * 0.45);
            this.fireSkullShot(ang, t);
        }
    }

    fireSkullShot(angle, target) {
        let maxRange = 520;
        let pSpeed = 13.5;
        let currentX = this.x;
        let currentY = this.y;
        let animTime = 0;
        let traveled = 0;
        let isDead = false;

        let skullProj = {
            dead: false,
            update: (dt) => {
                if (isDead) return;
                animTime += dt;
                let step = pSpeed * dt * 60;
                currentX += Math.cos(angle) * step;
                currentY += Math.sin(angle) * step;
                traveled += step;

                // Kiểm tra va chạm mục tiêu hoặc quái khác
                let hitTarget = null;
                for (let e of gameState.enemies) {
                    if (!e.dead && Math.hypot(currentX - e.x, currentY - e.y) <= (14 + e.radius)) {
                        hitTarget = e;
                        break;
                    }
                }

                if (hitTarget || traveled >= maxRange) {
                    isDead = true;
                    skullProj.dead = true;
                    this.explodeSkullHit(currentX, currentY);
                }
            },
            draw: (ctx) => {
                if (isDead) return;
                let frames = getValidFrames('Curses/Skull Shot');
                if (frames.length > 0) {
                    let fIdx = Math.floor(animTime * 20) % frames.length;
                    let img = frames[fIdx];
                    if (img && img.naturalWidth) {
                        ctx.save();
                        ctx.translate(currentX, currentY);
                        ctx.rotate(angle);
                        let w = img.naturalWidth * 1.3;
                        let h = img.naturalHeight * 1.3;
                        ctx.drawImage(img, -w / 2, -h / 2, w, h);
                        ctx.restore();
                        return;
                    }
                }
                ctx.save();
                ctx.fillStyle = '#2ecc71';
                ctx.beginPath();
                ctx.arc(currentX, currentY, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        };

        gameState.projectiles.push(skullProj);
    }

    explodeSkullHit(x, y) {
        // Nổ Curses/Skull Hit, gây dame ở Frame 3 (100% AD stvl trong vùng nhỏ)
        if (typeof spawnAnimatedEffect === 'function') {
            spawnAnimatedEffect('Curses/Skull Hit', x, y, {
                scale: 1.45,
                fps: 20,
                rotation: Math.random() * Math.PI * 2,
                onFrame: (frame) => {
                    if (frame === 3) {
                        let aoeRadius = 75;
                        let aoeDmg = this.stats.ad * 1.0;
                        gameState.enemies.forEach(e => {
                            if (!e.dead && Math.hypot(e.x - x, e.y - y) <= aoeRadius) {
                                e.takeDamage(aoeDmg, 'physical', this, false, 'skill');
                            }
                        });
                    }
                }
            });
        }
    }

    // CHIÊU 2: Lá Chắn Máu Ảo (15% Max HP)
    castSkill2() {
        if (this.cooldowns['2'] > 0 || this.shieldTimer > 0 || this.isResting || this.isGhost || this.isDetonating) return;
        this.maxShield = this.stats.maxHp * 0.15;
        this.shield = this.maxShield;
        this.shieldTimer = 5.0;
        this.shieldAnimTime = 0;
        this.shieldTickTimer = 0;
        this.isShieldShrinking = false;
    }

    // CHIÊU 3: Hóa Linh Hồn & Bộc Phá
    castSkill3() {
        if (this.isResting || this.isDetonating) return;

        // Nếu đang trong dạng Ma -> Chủ động kích hoạt lại để bộc phá kết thúc sớm
        if (this.isGhost) {
            this.triggerDetonation();
            return;
        }

        if (this.cooldowns['3'] > 0) return;

        this.isGhost = true;
        this.ghostTimer = 7.5;
        this.ghostAnimTime = 0;
    }

    triggerDetonation() {
        if (!this.isGhost) return;
        this.isGhost = false;
        this.ghostTimer = 0;
        this.cooldowns['3'] = this.maxCooldowns['3'] * (1 - Math.min(0.4, this.stats.cdr));

        // Bắt đầu chuỗi vụ nổ Banshee Scream: Đứng yên và bất tử đến khi kết thúc
        this.isDetonating = true;
        this.detonateAnimTime = 0;
        this.detonateTriggered = false;
    }

    draw(ctx) {
        if (this.dead) return;

        // 1. VẼ AURA CHIÊU 3 Ở DƯỚI LAYER NHÂN VẬT (Fire/Green)
        if (this.s3BuffTimer > 0 && !this.isDetonating) {
            let auraFrames = getValidFrames('Fire/Green');
            if (auraFrames.length > 0) {
                let fIdx = Math.floor(this.s3AuraAnimTime * 18) % auraFrames.length;
                let img = auraFrames[fIdx];
                if (img && img.naturalWidth) {
                    ctx.save();
                    ctx.translate(this.x, this.y + this.radius);
                    let scale = 3.2;
                    let w = img.naturalWidth * scale;
                    let h = img.naturalHeight * scale;
                    ctx.drawImage(img, -w / 2, -h, w, h);
                    ctx.restore();
                }
            }
        }

        // 2. VẼ LÁ CHẮN SPIRIT SHIELD Ở DƯỚI LAYER NHÂN VẬT
        if (this.shieldTimer > 0 || this.isShieldShrinking) {
            let shieldFrames = getValidFrames('Spirits/Spirit Shield');
            if (shieldFrames.length > 0) {
                let fIdx = Math.floor(this.shieldAnimTime * 18) % shieldFrames.length;
                let img = shieldFrames[fIdx];
                if (img && img.naturalWidth) {
                    ctx.save();
                    ctx.translate(this.x, this.y);
                    let targetSize = 290;
                    let scale = targetSize / img.naturalWidth;
                    if (this.isShieldShrinking) {
                        scale *= Math.max(0.01, this.shieldShrinkTimer / 0.25);
                    }
                    let w = img.naturalWidth * scale;
                    let h = img.naturalHeight * scale;
                    ctx.drawImage(img, -w / 2, -h / 2, w, h);
                    ctx.restore();
                }
            }
        }

        // 3. VẼ DẠNG MA / DẠNG THƯỜNG / HOẶC HOẠT ẢNH NỔ BANSHEE SCREAM
        if (this.isDetonating) {
            let screamFrames = getValidFrames('Spirits/Banshee Scream');
            if (screamFrames.length > 0) {
                const fps = 14;
                let fIdx = Math.floor(this.detonateAnimTime * fps);
                if (fIdx < screamFrames.length) {
                    let img = screamFrames[fIdx];
                    if (img && img.naturalWidth) {
                        ctx.save();
                        ctx.translate(this.x, this.y);
                        let progress = fIdx / (screamFrames.length - 1);
                        let finalDiameter = (185 * 2) * 1.20;
                        let currentDiameter = finalDiameter * (0.55 + 0.45 * progress);
                        let scale = currentDiameter / img.naturalWidth;
                        let w = img.naturalWidth * scale;
                        let h = img.naturalHeight * scale;
                        ctx.drawImage(img, -w / 2, -h / 2, w, h);
                        ctx.restore();
                    }
                }
            }
        } else if (this.isGhost) {
            let ghostFrames = getValidFrames('Spirits/Ghost Rise');
            if (ghostFrames.length > 0) {
                let fIdx = Math.floor(this.ghostAnimTime * 18) % ghostFrames.length;
                let img = ghostFrames[fIdx];
                if (img && img.naturalWidth) {
                    ctx.save();
                    ctx.translate(this.x, this.y);
                    let facingRight = Math.cos(this.angle) > 0;
                    if (facingRight) ctx.scale(-1, 1);
                    let w = img.naturalWidth * 1.5;
                    let h = img.naturalHeight * 1.5;
                    ctx.drawImage(img, -w / 2, -h / 2, w, h);
                    ctx.restore();
                }
            }
        } else {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.shadowColor = (this.s3BuffTimer > 0 || this.s1ArmorBuffTimer > 0) ? '#2ecc71' : this.color;
            ctx.shadowBlur = this.s3BuffTimer > 0 ? 18 : 8;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Song kiếm hắc ám
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.fillStyle = '#2d3436';
            ctx.fillRect(this.radius - 2, -7, 18, 4);
            ctx.fillRect(this.radius - 2, 3, 18, 4);
            ctx.fillStyle = '#00b894';
            ctx.fillRect(this.radius + 10, -6, 5, 2);
            ctx.fillRect(this.radius + 10, 4, 5, 2);
            ctx.restore();
            ctx.restore();
        }

        // 4. VẼ HOẠT ẢNH CHÉM TẦM GẦN
        if (this.isAttacking) {
            let folder = 'Slashes/Green/Slash3';
            if (this.comboStage === 2) folder = 'Slashes/Green/Slash';
            else if (this.comboStage === 3) folder = 'Slashes/Green/Slash2';

            let slashFrames = getValidFrames(folder);
            if (slashFrames.length > 0) {
                let fIdx = Math.floor(this.attackAnimTime * 18);
                if (fIdx < slashFrames.length) {
                    let img = slashFrames[fIdx];
                    if (img && img.naturalWidth) {
                        ctx.save();
                        ctx.translate(this.x, this.y);
                        ctx.rotate(this.attackAngle);
                        let w = img.naturalWidth * 1.62;
                        let h = img.naturalHeight * 1.62;
                        ctx.drawImage(img, 0, -h / 2, w, h);
                        ctx.restore();
                    }
                }
            }
        }
    }
}

// Đăng ký tướng Taking vào global
window.Taking = Taking;