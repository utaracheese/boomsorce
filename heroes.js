// === HỆ THỐNG STATS, ENTITY VÀ TƯỚNG RIVENT ===
class Stats {
    constructor(config = {}) {
        this.maxHp = config.maxHp !== undefined ? config.maxHp : 520;
        this.hp = this.maxHp;
        this.hpRegen = config.hpRegen !== undefined ? config.hpRegen : 3.0;
        this.maxMana = config.maxMana !== undefined ? config.maxMana : 320;
        this.mana = this.maxMana;
        this.manaRegen = config.manaRegen !== undefined ? config.manaRegen : 4.0;
        this.ad = config.ad !== undefined ? config.ad : 32;
        this.ap = config.ap !== undefined ? config.ap : 0;
        this.attackSpeed = config.attackSpeed !== undefined ? config.attackSpeed : 1.15;
        this.speed = config.speed !== undefined ? config.speed : 3.9;
        this.armor = config.armor !== undefined ? config.armor : 26;
        this.mr = config.mr !== undefined ? config.mr : 24;
        this.armorPen = config.armorPen || 0;
        this.magicPen = config.magicPen || 0;
        this.cdr = config.cdr || 0;
        this.lifesteal = config.lifesteal || 0;
        this.spellVamp = config.spellVamp || 0;
        this.critRate = config.critRate !== undefined ? config.critRate : 15;
        this.critDamage = config.critDamage || 0;
        this.expBonus = config.expBonus || 0;
    }

    update(dt) {
        if (this.hp < this.maxHp && this.hp > 0) {
            this.hp = Math.min(this.maxHp, this.hp + this.hpRegen * dt);
        }
        if (this.maxMana > 0 && this.mana < this.maxMana) {
            this.mana = Math.min(this.maxMana, this.mana + this.manaRegen * dt);
        }
    }
}

class Entity {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.dead = false;
        this.isMonster = false;
        this.stunTimer = 0;
        this.freezeTimer = 0;
        this.freezeMax = 0;
        this.armorShredTimer = 0;
        this.armorShredVal = 0;
        this.slowTimer = 0;
        this.slowAmount = 0;
        this.burnTimer = 0;
        this.burnTickTimer = 0;
        this.burnDmg = 0;
        this.burnAttacker = null;
        this.burnFx = null;
        this.shield = 0;
        this.shieldFx = null;
    }

    clearVisualEffects() {
        if (this.burnFx) {
            this.burnFx.dead = true;
            this.burnFx = null;
        }
        if (this.shieldFx) {
            this.shieldFx.dead = true;
            this.shieldFx = null;
        }
    }

    takeDamage(amount, type, attacker = null, isCrit = false, source = 'skill') {
        if (this.dead) return 0;
        let finalDmg = amount;

        // Nội tại Chiến Kiếm Cổ Đại: Tăng 30% sát thương lên quái dưới 50% HP
        if (this.isMonster && attacker && typeof playerHasUniquePassive === 'function' && playerHasUniquePassive(attacker, 'Điểm Yếu')) {
            if (this.stats.hp <= this.stats.maxHp * 0.5) {
                finalDmg *= 1.30;
            }
        }

        // Nội tại Phật Tổ Trường Sinh: Đang trong thời gian bất tử
        if (this.phatToImmortalTimer && this.phatToImmortalTimer > 0) {
            return 0;
        }

        // Nội tại Hắc Kiếm Dracula: Đang trong trạng thái Uống Máu (miễn thương 50%)
        if (this.draculaBuffTimer && this.draculaBuffTimer > 0) {
            finalDmg *= 0.50;
        }

        if (type !== 'true') {
            let rawPen = (attacker && attacker.getArmorPen)
                ? attacker.getArmorPen()
                : ((attacker && attacker.stats) ? (type === 'physical' ? attacker.stats.armorPen : attacker.stats.magicPen) : 0);
            let effectiveDef = (type === 'physical') ? Math.max(0, this.stats.armor - this.armorShredVal) : this.stats.mr;
            let res = Math.max(0, effectiveDef - rawPen);

            finalDmg = finalDmg * (100 / (100 + res));
        }

        // Máu ảo (Shield): chặn sát thương vật lý & phép, KHÔNG chặn sát thương chuẩn
        let absorbedByShield = 0;
        if (this.shield > 0 && type !== 'true') {
            absorbedByShield = Math.min(this.shield, finalDmg);
            this.shield -= absorbedByShield;
            finalDmg -= absorbedByShield;
            if (this.shield <= 0) {
                this.shield = 0;
                if (this.shieldFx) {
                    this.shieldFx.dead = true;
                    this.shieldFx = null;
                }
            }
        }

        // Kiểm tra kích hoạt Phật Tổ Trường Sinh khi nhận sát thương chí tử
        if (!this.isMonster && typeof playerHasUniquePassive === 'function' && playerHasUniquePassive(this, 'Từ Chối Tử Thần')) {
            if (this.stats.hp - finalDmg <= 0 && (!this.phatToCooldown || this.phatToCooldown <= 0)) {
                this.phatToCooldown = 90.0;
                this.phatToImmortalTimer = 1.5;
                this.stats.hp = 1;
                gameState.damageTexts.push({
                    x: this.x,
                    y: this.y - this.radius - 18,
                    text: "BẤT TỬ 1.5S",
                    color: "#f1c40f",
                    isCrit: true,
                    life: 1.2
                });
                return 0;
            }
        }

        this.stats.hp = Math.max(0, this.stats.hp - finalDmg);

        // Kiểm tra kích hoạt Uống Máu của Hắc Kiếm Dracula khi xuống dưới 30% HP
        if (!this.isMonster && typeof playerHasUniquePassive === 'function' && playerHasUniquePassive(this, 'Uống Máu')) {
            if (this.stats.hp <= this.stats.maxHp * 0.30 && (!this.draculaCooldown || this.draculaCooldown <= 0)) {
                this.draculaCooldown = 75.0;
                this.draculaBuffTimer = 2.0;
                recalculatePlayerStats(this);
                gameState.damageTexts.push({
                    x: this.x,
                    y: this.y - this.radius - 18,
                    text: "UỐNG MÁU!",
                    color: "#e74c3c",
                    isCrit: true,
                    life: 1.2
                });
            }
        }

        if (attacker && finalDmg > 0) {
            if (source === 'basic_attack' && type === 'physical' && attacker.stats.lifesteal > 0) {
                attacker.heal(finalDmg * (attacker.stats.lifesteal / 100));
            }
            if (source === 'skill' && attacker.stats.spellVamp > 0) {
                attacker.heal(finalDmg * (attacker.stats.spellVamp / 100));
            }
        }

        let roundedDmg = Math.round(finalDmg);
        let displayVal = roundedDmg > 0 ? roundedDmg : Math.round(absorbedByShield);
        if (displayVal > 0) {
            let dmgColor = roundedDmg > 0
                ? (type === 'physical' ? '#ff3838' : (type === 'magic' ? '#c56cf0' : '#ffffff'))
                : '#dfe6e9';

            while (gameState.damageTexts.length >= 25) {
                gameState.damageTexts.shift();
            }

            gameState.damageTexts.push({
                x: this.x + (Math.random() - 0.5) * 20,
                y: this.y - this.radius - 8,
                text: displayVal.toString(),
                color: dmgColor,
                isCrit: isCrit && roundedDmg > 0,
                life: 0.85
            });
        }

        if (this.stats.hp <= 0 && this.monsterType !== 'dummy') {
            this.dead = true;
            this.shield = 0; // Hết HP mà vẫn còn giáp ảo -> tự hủy giáp
            this.clearVisualEffects();
            this.onDeath(attacker);
        }
        return finalDmg + absorbedByShield;
    }

    updateBurn(dt) {
        if (this.dead) {
            this.burnTimer = 0;
            if (this.burnFx) {
                this.burnFx.dead = true;
                this.burnFx = null;
            }
            return;
        }
        if (this.burnTimer > 0) {
            this.burnTimer -= dt;
            this.burnTickTimer -= dt;
            if (this.burnTickTimer <= 0) {
                this.burnTickTimer = 1.0;
                this.takeDamage(this.burnDmg, 'true', this.burnAttacker, false, 'dot');
            }
            if (this.burnTimer <= 0 || this.dead) {
                this.burnTimer = 0;
                if (this.burnFx) {
                    this.burnFx.dead = true;
                    this.burnFx = null;
                }
            }
        }
    }

    heal(amt) {
        if (this.dead) return;
        this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + amt);
    }

    applySlow(amount, duration) {
        this.slowAmount = Math.max(this.slowAmount, amount);
        this.slowTimer = Math.max(this.slowTimer, duration);
    }

    onDeath(killer) {
        this.shield = 0;
        this.clearVisualEffects();

        if (this.isMonster && killer && !killer.isMonster) {
            if (typeof hookCardOnKill === 'function') {
                hookCardOnKill(killer, this);
            }

            if (typeof playerHasUniquePassive === 'function') {
                let hasKartana = playerHasUniquePassive(killer, 'Kartana_Passives');
                let hasGuom = playerHasUniquePassive(killer, 'Gươm Diệt Quỷ_Passives');
                if (hasKartana || hasGuom) {
                    killer.demonKillCounter = (killer.demonKillCounter || 0) + 1;
                    if (killer.demonKillCounter >= 20) {
                        killer.demonKillCounter = 0;
                        let maxMarks = hasGuom ? 30 : 15;
                        if ((killer.demonMarks || 0) < maxMarks) {
                            killer.demonMarks = (killer.demonMarks || 0) + 1;
                            recalculatePlayerStats(killer);
                        }
                    }
                }

                let hasDaoPhep = playerHasUniquePassive(killer, 'DaoPhép_Passives');
                let hasKiemThapTu = playerHasUniquePassive(killer, 'KiếmThậpTự_Passives');
                if (hasDaoPhep || hasKiemThapTu) {
                    killer.apDemonKillCounter = (killer.apDemonKillCounter || 0) + 1;
                    if (killer.apDemonKillCounter >= 20) {
                        killer.apDemonKillCounter = 0;
                        let maxMarks = hasKiemThapTu ? 30 : 15;
                        if ((killer.apDemonMarks || 0) < maxMarks) {
                            killer.apDemonMarks = (killer.apDemonMarks || 0) + 1;
                            recalculatePlayerStats(killer);
                        }
                    }

                    if (hasDaoPhep && (!killer.daoPhepCdReductionTimer || killer.daoPhepCdReductionTimer <= 0)) {
                        killer.daoPhepCdReductionTimer = 5.0;
                        for (let sk in killer.cooldowns) {
                            killer.cooldowns[sk] = Math.max(0, killer.cooldowns[sk] - 0.5);
                        }
                    }
                }

                let hasRiuLua = playerHasUniquePassive(killer, 'Rìu Lửa_Passives');
                let hasRiuHoaLong = playerHasUniquePassive(killer, 'Rìu Hỏa Long_Passives');
                if (hasRiuLua || hasRiuHoaLong) {
                    killer.hpDemonKillCounter = (killer.hpDemonKillCounter || 0) + 1;
                    if (killer.hpDemonKillCounter >= 20) {
                        killer.hpDemonKillCounter = 0;
                        let maxMarks = hasRiuHoaLong ? 30 : 15;
                        if ((killer.hpDemonMarks || 0) < maxMarks) {
                            killer.hpDemonMarks = (killer.hpDemonMarks || 0) + 1;
                            recalculatePlayerStats(killer);
                        }
                    }
                }
            }
        }
    }
}

class Monster extends Entity {
    constructor(x, y, radius, color, config = {}) {
        super(x, y, radius, color);
        this.isMonster = true;
        let baseSpeed = config.speed !== undefined ? (config.speed > 20 ? config.speed / 100 : config.speed) : 1.7;

        this.stats = new Stats({
            maxHp: config.hp !== undefined ? config.hp : 750,
            hpRegen: config.hpRegen || 0,
            maxMana: config.mana || 0,
            manaRegen: config.manaRegen || 0,
            ad: config.dame !== undefined ? config.dame : (config.ad || 35),
            ap: config.ap || 0,
            attackSpeed: config.attackSpeed || 1.1,
            speed: baseSpeed,
            armor: config.armor !== undefined ? config.armor : 15,
            mr: config.mr !== undefined ? config.mr : 0,
            armorPen: config.armorpen !== undefined ? config.armorpen : (config.armorPen || 10),
            magicPen: config.magicPen || 0,
            cdr: config.cdr || 0,
            lifesteal: config.lifesteal || 0,
            spellVamp: config.spellVamp || 0,
            critRate: config.critRate || 0,
            critDamage: config.critDamage || 0,
            expBonus: config.expBonus || 0
        });
    }

    getActualSpeed() {
        if ((typeof gameState !== 'undefined' && gameState.practiceFreezeMonsters) || (this.freezeTimer && this.freezeTimer > 0)) {
            return 0;
        }
        let spd = this.stats.speed;
        if (this.slowTimer > 0) {
            spd *= (1 - this.slowAmount);
        }
        return spd;
    }
}

class PlayerHero extends Entity {
    constructor(id, x, y, customConfig = {}) {
        super(x, y, 18, id === 1 ? '#00e5ff' : '#ff9800');
        this.id = id;
        this.heroType = 'rivent';
        this.isResting = false;

        // Nội tại thẻ bài đột phá & trang bị mở rộng
        this.cardRanks = {};
        this.demonMarks = 0;
        this.demonKillCounter = 0;
        this.satChopStacks = 0;
        this.satChopTimer = 0;
        this.draculaCooldown = 0;
        this.draculaBuffTimer = 0;
        this.phatToCooldown = 0;
        this.phatToImmortalTimer = 0;

        // Dơi quỷ pet
        this.batOrbitAngle = 0;
        this.batShootTimer = 1.0 + Math.random() * 2.0;
        this.batAnimTime = 0;

        // Tải trước frame Dơi
        if (typeof getAnimFrames === 'function') {
            getAnimFrames('Bats/Fly', 4);
            getAnimFrames('Bats/Hit', 4);
        }

        this.baseStats = {
            maxHp: 520,
            hpRegen: 3.0,
            maxMana: 320,
            manaRegen: 4.0,
            ad: 32,
            ap: 0,
            attackSpeed: 1.15,
            speed: 3.9,
            armor: 26,
            mr: 24,
            armorPen: 0,
            magicPen: 0,
            cdr: 0,
            lifesteal: 0,
            spellVamp: 0,
            critRate: 15,
            critDamage: 0,
            expBonus: 0,
            ...customConfig
        };

        this.bonusStats = {};
        this.attackSpeedBonus = 0;
        this.stats = new Stats(this.baseStats);

        this.level = 1;
        this.exp = 0;
        // EXP cố định x35 lần và không cần thêm exp sau mỗi cấp
        this.expNeeded = 40 * 35;
        this.pendingLevelUps = 0;
        this.upgradesChosenCount = 0;
        this.chosenPremiumUpgrades = new Set();

        this.gold = customConfig.startingGold !== undefined ? customConfig.startingGold : 500;
        this.inventory = [];
        this.itemCooldowns = {};
        this.attackCooldown = 0;
        this.cooldowns = { '1': 0, '2': 0, '3': 0 };
        this.maxCooldowns = { '1': 3.5, '2': 8, '3': 10 };
        this.manaCosts = { '1': 20, '2': 35, '3': 60 };
        this.angle = 0;

        recalculatePlayerStats(this);
    }

    getArmorPen() {
        return this.stats.armorPen;
    }

    gainExp(amt) {
        let mult = 1.0 + (this.stats.expBonus / 100);
        this.exp += amt * mult;
        while (this.exp >= this.expNeeded) {
            this.exp -= this.expNeeded;
            this.level++;
            // Giữ nguyên mức 1400 EXP cố định (không cộng thêm khi lên cấp)
            this.expNeeded = 40 * 35;
            this.pendingLevelUps++;

            this.baseStats.maxHp += 55;
            if (this.baseStats.maxMana > 0) this.baseStats.maxMana += 30;
            this.baseStats.ad += 4.5;
            this.baseStats.armor += 2.5;
            this.baseStats.mr += 1.8;

            recalculatePlayerStats(this);

            this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + this.stats.maxHp * 0.35);
            if (this.stats.maxMana > 0) {
                this.stats.mana = Math.min(this.stats.maxMana, this.stats.mana + this.stats.maxMana * 0.35);
            }

            createLevelUpParticles(this.x, this.y, this.color);
        }
// === BỔ SUNG TRONG gainExp CỦA PlayerHero (KHI this.level++): ===
// Phần thưởng anh hùng (Găng Tay Anh Hùng): hồi 20% HP & Mana đã mất
if (typeof playerHasUniquePassive === 'function' && playerHasUniquePassive(this, 'Phần Thưởng Anh Hùng')) {
    this.heroRewardUsed = this.heroRewardUsed || 0;
    if (this.heroRewardUsed < 15) {
        this.heroRewardUsed++;
        let lostHp = Math.max(0, this.stats.maxHp - this.stats.hp);
        let lostMana = Math.max(0, this.stats.maxMana - this.stats.mana);
        this.heal(lostHp * 0.20);
        if (this.stats.maxMana > 0) {
            this.stats.mana = Math.min(this.stats.maxMana, this.stats.mana + lostMana * 0.20);
        }
    }
}
    }

    fireBatBloodBullet() {
        let batX = this.x + Math.cos(this.batOrbitAngle) * 42;
        let batY = this.y + Math.sin(this.batOrbitAngle) * 32;

        let targets = gameState.enemies.filter(e => !e.dead && Math.hypot(e.x - batX, e.y - batY) <= 420);
        if (targets.length === 0) return;

        let target = targets[Math.floor(Math.random() * targets.length)];
        let angle = Math.atan2(target.y - batY, target.x - batX);

        gameState.projectiles.push(new Projectile({
            owner: this,
            attackType: 'item',
            x: batX, y: batY,
            vx: Math.cos(angle), vy: Math.sin(angle),
            radius: 5,
            speed: 13,
            damage: 30,
            dmgType: 'magic',
            color: '#c0392b',
            range: 450,
            hitEffect: 'Bats/Hit',
            hitEffectScale: 1.4,
            onHitExtra: (hitTarget) => {
                this.heal(30);
            }
        }));
    }

    drawBatPet(ctx) {
        if (typeof playerHasUniquePassive === 'function' && playerHasUniquePassive(this, 'Dơi Quỷ Triệu Hồi')) {
            let batX = this.x + Math.cos(this.batOrbitAngle) * 42;
            let batY = this.y + Math.sin(this.batOrbitAngle) * 32;

            if (typeof getValidFrames === 'function') {
                let frames = getValidFrames('Bats/Fly');
                if (frames.length > 0) {
                    const loopSeq = [0, 1, 2, 3, 2, 1];
                    let step = Math.floor(this.batAnimTime * 12) % loopSeq.length;
                    let imgIdx = loopSeq[step];
                    let img = frames[Math.min(frames.length - 1, imgIdx)];

                    if (img && img.naturalWidth > 0) {
                        ctx.save();
                        ctx.translate(batX, batY);
                        if (Math.cos(this.batOrbitAngle) < 0) ctx.scale(-1, 1);
                        let w = img.naturalWidth * 1.35;
                        let h = img.naturalHeight * 1.35;
                        ctx.drawImage(img, -w / 2, -h / 2, w, h);
                        ctx.restore();
                    }
                }
            }
        }
    }

    getActualSpeed() {
        return this.stats.speed;
    }

    update(dt) {
        if (this.dead) return;
        this.stats.update(dt);

        if (!this.isResting) {
            this.gold += 3 * dt;
        }

        if (this.attackCooldown > 0) this.attackCooldown -= dt;
        for (let k in this.cooldowns) {
            if (this.cooldowns[k] > 0) this.cooldowns[k] -= dt;
        }
        for (let k in this.itemCooldowns) {
            if (this.itemCooldowns[k] > 0) this.itemCooldowns[k] -= dt;
        }
        if (this.stunTimer > 0) this.stunTimer -= dt;

        // Cập nhật Sát Chớp Kiếm
        if (this.satChopTimer > 0) {
            this.satChopTimer -= dt;
            if (this.satChopTimer <= 0) {
                this.satChopStacks = 0;
                recalculatePlayerStats(this);
            }
        }

        // Cập nhật Hắc Kiếm Dracula
        if (this.draculaBuffTimer > 0) {
            this.draculaBuffTimer -= dt;
            if (this.draculaBuffTimer <= 0) recalculatePlayerStats(this);
        }
        if (this.draculaCooldown > 0) this.draculaCooldown -= dt;

        // Cập nhật Phật Tổ Trường Sinh
        if (this.phatToImmortalTimer > 0) this.phatToImmortalTimer -= dt;
        if (this.phatToCooldown > 0) this.phatToCooldown -= dt;

        // Cập nhật Dơi Quỷ bay quanh chủ & bắn huyết đạn
        if (typeof playerHasUniquePassive === 'function' && playerHasUniquePassive(this, 'Dơi Quỷ Triệu Hồi')) {
            this.batAnimTime += dt;
            this.batOrbitAngle += 2.5 * dt;

            this.batShootTimer -= dt;
            if (this.batShootTimer <= 0) {
                this.batShootTimer = 1.0 + Math.random() * 2.0;
                this.fireBatBloodBullet();
            }
        }
// === BỔ SUNG VÀO PlayerHero.prototype.update ===
// Thêm các bộ đếm kỹ năng trang bị
if (this.daoPhepCdReductionTimer > 0) this.daoPhepCdReductionTimer -= dt;
if (this.cuongSatCooldown > 0) this.cuongSatCooldown -= dt;
if (this.cuongSatBuffTimer > 0) {
    this.cuongSatBuffTimer -= dt;
    if (this.cuongSatBuffTimer <= 0) recalculatePlayerStats(this);
}
if (this.tinhLinhCooldown > 0) this.tinhLinhCooldown -= dt;
if (this.tinhLinhRegenTimer > 0) {
    this.tinhLinhRegenTimer -= dt;
    this.heal(this.tinhLinhRegenPerSec * dt);
}
if (this.reflectCooldown > 0) this.reflectCooldown -= dt;

// Ma Thiên Kiếm stack timer
if (this.mtkTimer > 0) {
    this.mtkTimer -= dt;
    if (this.mtkTimer <= 0) {
        this.mtkStacks = 0;
        recalculatePlayerStats(this);
    }
}

// Reset Khiên Phép Panorama mỗi 15s
if (typeof playerHasUniquePassive === 'function' && playerHasUniquePassive(this, 'Khiên Phép Panorama')) {
    this.panoramaResetTimer = (this.panoramaResetTimer || 0) + dt;
    if (this.panoramaResetTimer >= 15.0) {
        this.panoramaResetTimer = 0;
        this.panoramaShield = 1200;
    }
}

// Tích điểm Vòng Tay Ánh Sáng mỗi 30s
if (typeof playerHasUniquePassive === 'function' && playerHasUniquePassive(this, 'Phần Thưởng Thần Thánh')) {
    if (this.vtasPoints === undefined) {
        this.vtasPoints = 1; // +1 điểm ngay khi mua
        recalculatePlayerStats(this);
    }
    this.vtasTimer = (this.vtasTimer || 0) + dt;
    if (this.vtasTimer >= 30.0) {
        this.vtasTimer = 0;
        if (this.vtasPoints < 15) {
            this.vtasPoints++;
            recalculatePlayerStats(this);
        }
    }
}

// Năng Lượng Beacon (Linh hồn cỏ cây)
this.outOfCombatTimer = (this.outOfCombatTimer || 0) + dt;
if (typeof playerHasUniquePassive === 'function' && playerHasUniquePassive(this, 'Linh Hồn Cỏ Cây')) {
    let rate = (this.outOfCombatTimer >= 5.0) ? 0.015 : 0.0025;
    this.heal(this.stats.maxHp * rate * dt);
}

// Hào quang Chân Lạnh (Giày Băng Hà)
if (typeof playerHasUniquePassive === 'function' && playerHasUniquePassive(this, 'Chân Lạnh')) {
    gameState.enemies.forEach(e => {
        if (!e.dead && Math.hypot(e.x - this.x, e.y - this.y) <= 180) {
            e.applySlow(0.50, 0.5);
        }
    });
}

// Hào quang đốt của Rìu Lửa / Rìu Hỏa Long
this.fireAuraTickTimer = (this.fireAuraTickTimer || 0) + dt;
if (this.fireAuraTickTimer >= 1.0) {
    this.fireAuraTickTimer = 0;
    let hasRiuHoaLong = typeof playerHasUniquePassive === 'function' && playerHasUniquePassive(this, 'Rìu Hỏa Long_Passives');
    let hasRiuLua = typeof playerHasUniquePassive === 'function' && playerHasUniquePassive(this, 'Rìu Lửa_Passives');

    if (hasRiuHoaLong) {
        let lostHp = Math.max(0, this.stats.maxHp - this.stats.hp);
        let burnDmg = 15 + (lostHp * 0.02);
        gameState.enemies.forEach(e => {
            if (!e.dead && Math.hypot(e.x - this.x, e.y - this.y) <= 190) {
                e.takeDamage(burnDmg, 'magic', this, false, 'dot');
            }
        });
    } else if (hasRiuLua) {
        gameState.enemies.forEach(e => {
            if (!e.dead && Math.hypot(e.x - this.x, e.y - this.y) <= 180) {
                e.takeDamage(10, 'magic', this, false, 'dot');
            }
        });
    }
}
    }
}

// === TƯỚNG RIVENT: XẠ THỦ 4 VIÊN ĐẠN ===
class Rivent extends PlayerHero {
    constructor(id, x, y, extraConfig = {}) {
        super(id, x, y, {
            maxHp: 500,
            ad: 34,
            attackSpeed: 1.15,
            speed: 3.95,
            armor: 25,
            mr: 22,
            critRate: 15,
            ...extraConfig
        });
        this.heroType = 'rivent';
        this.shotCount = 0;
        this.s2BuffTimer = 0;
        this.s3Charging = false;
        this.s3ChargeTimer = 0;
        this.s3Angle = 0;
    }

    update(dt) {
        super.update(dt);
        if (this.s2BuffTimer > 0) {
            this.s2BuffTimer -= dt;
        }

        if (this.s3Charging) {
            this.s3ChargeTimer -= dt;
            if (this.s3ChargeTimer <= 0) {
                this.s3Charging = false;
                this.fireSkill3Barrage(this.s3Angle);
            }
        }
    }

    getActualSpeed() {
        let s = this.stats.speed;
        if (this.s2BuffTimer > 0) s *= 1.45;
        if (this.s3Charging) s *= 0.70;
        return s;
    }

    castBasicAttack(targetAngle) {
        if (this.attackCooldown > 0 || this.stunTimer > 0 || this.isResting) return;
        this.attackCooldown = this.stats.attackSpeed;
        this.angle = targetAngle;

        this.shotCount++;
        let isFourthShot = (this.shotCount >= 4);
        if (isFourthShot) this.shotCount = 0;

        let baseDamage = this.stats.ad * (isFourthShot ? 2.0 : 1.0);

        let isCrit = (Math.random() * 100 < this.stats.critRate);
        if (isCrit) {
            let critMult = 2.0 + (this.stats.critDamage / 100);
            baseDamage *= critMult;
        }

        let isSplash = (this.s2BuffTimer > 0);
        let bulletRadius = isFourthShot ? 11 : 6.5;

        if (window.mapProps && window.mapProps.isEntityInBush(this)) {
            if (typeof onPlayerGunshotInBush === 'function') {
                onPlayerGunshotInBush(this);
            }
        }

        gameState.projectiles.push(new Projectile({
            owner: this,
            attackType: 'basic_attack',
            x: this.x + Math.cos(targetAngle) * 18,
            y: this.y + Math.sin(targetAngle) * 18,
            vx: Math.cos(targetAngle), vy: Math.sin(targetAngle),
            radius: bulletRadius,
            speed: isFourthShot ? 16 : 14,
            damage: baseDamage,
            dmgType: 'physical',
            color: isFourthShot ? '#ff1744' : '#00e5ff',
            isCrit: isCrit,
            isFourthShot: isFourthShot,
            hasSplash: isSplash,
            splashRatio: 0.35,
            range: 480,
            spriteFolder: isFourthShot ? 'Projectiles/Plasma Shot' : 'Projectiles/Fireball Shot',
            hitEffect: isFourthShot ? 'Hit Sparks/Shock Hit' : 'Hit Sparks/Fire Hit',
            spriteScale: isFourthShot ? (1.35 * 1.35) : (1.05 * 1.35),
            hitEffectScale: isFourthShot ? (1.35 * 1.45) : (1.15 * 1.35)
        }));

        if (isSplash) this.s2BuffTimer = 0;
    }

    castSkill1(targetAngle) {
        if (this.cooldowns['1'] > 0 || this.stats.mana < this.manaCosts['1'] || this.isResting) return;
        this.stats.mana -= this.manaCosts['1'];
        this.cooldowns['1'] = this.maxCooldowns['1'] * (1 - Math.min(0.4, this.stats.cdr));

        gameState.projectiles.push(new Projectile({
            owner: this,
            attackType: 'skill',
            x: this.x, y: this.y,
            vx: Math.cos(targetAngle), vy: Math.sin(targetAngle),
            radius: 7, 
            speed: 28,
            damage: this.stats.ad * 0.75,
            dmgType: 'physical',
            color: '#76ff03',
            piercing: true,
            range: 5000,
            spriteFolder: 'Projectiles/Energy Bolt',
            spriteScale: 1.25 * 1.35,
            hitEffect: 'Hit Sparks/Shock Hit',
            hitEffectScale: 1.25 * 1.35,
            onHitExtra: (target) => {
                target.armorShredVal = 50;
                target.armorShredTimer = 4.0;
            }
        }));
    }

    castSkill2() {
        if (this.cooldowns['2'] > 0 || this.stats.mana < this.manaCosts['2'] || this.isResting) return;
        this.stats.mana -= this.manaCosts['2'];
        this.cooldowns['2'] = this.maxCooldowns['2'] * (1 - Math.min(0.4, this.stats.cdr));
        this.s2BuffTimer = 2.5;

        if (typeof spawnAnimatedEffect === 'function') {
            spawnAnimatedEffect('Explosions/Shockwave', this.x, this.y, { 
                scale: 1.6 * 1.35,
                fps: 22, 
                rotation: 0 
            });
        }
    }

    castSkill3(targetAngle) {
        if (this.cooldowns['3'] > 0 || this.stats.mana < this.manaCosts['3'] || this.isResting) return;
        this.stats.mana -= this.manaCosts['3'];
        this.cooldowns['3'] = this.maxCooldowns['3'] * (1 - Math.min(0.4, this.stats.cdr));

        this.s3Charging = true;
        this.s3ChargeTimer = 0.45;
        this.s3Angle = targetAngle;
    }

    fireSkill3Barrage(centerAngle) {
        const bulletCount = 12;
        const spreadArc = Math.PI / 2.8;
        const startAngle = centerAngle - spreadArc / 2;
        const step = spreadArc / (bulletCount - 1);

        if (typeof spawnAnimatedEffect === 'function') {
            spawnAnimatedEffect('Explosions/Shockwave', this.x + Math.cos(centerAngle) * 20, this.y + Math.sin(centerAngle) * 20, {
                scale: 1.4 * 1.35,
                fps: 24,
                rotation: centerAngle
            });
        }

        for (let i = 0; i < bulletCount; i++) {
            let a = startAngle + step * i;
            let isCrit = (Math.random() * 100 < this.stats.critRate);
            let dmg = this.stats.ad * 0.55;
            if (isCrit) dmg *= (2.0 + this.stats.critDamage / 100);

            gameState.projectiles.push(new Projectile({
                owner: this,
                attackType: 'skill',
                x: this.x, y: this.y,
                vx: Math.cos(a), vy: Math.sin(a),
                radius: 5.5, 
                speed: 13.5,
                damage: dmg,
                dmgType: 'physical',
                color: '#e0f7fa',
                isCrit: isCrit,
                noLifesteal: true,
                range: 650,
                spriteFolder: 'Projectiles/Fireball Shot',
                hitEffect: 'Hit Sparks/Fire Hit',
                spriteScale: 0.95 * 1.35,
                hitEffectScale: 1.05 * 1.35
            }));
        }
    }

    draw(ctx) {
        if (this.dead) return;

        // Vòng định hướng sạc chiêu 3
        if (this.s3Charging) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.s3Angle);
            ctx.fillStyle = "rgba(0, 229, 255, 0.18)";
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, 360, -Math.PI / 5.6, Math.PI / 5.6);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = "rgba(0, 229, 255, 0.6)";
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();
        }

        // Vòng biểu thị đạn cường hóa chiêu 2
        if (this.s2BuffTimer > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 6, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(0, 229, 255, 0.7)";
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            ctx.stroke();
            ctx.restore();
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // Nòng súng & chỉ báo viên thứ 4
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = "#222";
        ctx.fillRect(this.radius - 2, -4, 14, 8);
        ctx.fillStyle = this.shotCount === 3 ? '#ff1744' : '#00e5ff';
        ctx.fillRect(this.radius + 8, -2, 4, 4);
        ctx.restore();

        // Băng đạn 4 viên phía trên đầu
        let barW = 32;
        let barH = 5;
        let startX = this.x - barW / 2;
        let startY = this.y - this.radius - 14;
        let slotW = barW / 4;

        for (let i = 0; i < 4; i++) {
            ctx.fillStyle = "rgba(0,0,0,0.6)";
            ctx.fillRect(startX + i * slotW, startY, slotW - 2, barH);

            if (i < this.shotCount) {
                ctx.fillStyle = (i === 3) ? '#ff1744' : '#00e5ff';
                ctx.fillRect(startX + i * slotW, startY, slotW - 2, barH);
            }
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 0.8;
            ctx.strokeRect(startX + i * slotW, startY, slotW - 2, barH);
        }

        this.drawBatPet(ctx);
    }
}

// === ĐẠN LƯỠI CẮT PARABOL CỦA WIRDOR ===
class CurvedBladeProjectile {
    constructor(cfg) {
        this.owner = cfg.owner;
        this.skillKey = cfg.skillKey;
        this.startX = cfg.startX;
        this.startY = cfg.startY;
        this.targetX = cfg.targetX;
        this.targetY = cfg.targetY;
        this.curvature = cfg.curvature;
        this.duration = cfg.duration || 0.45;
        this.time = 0;
        this.animTime = 0;
        this.damage = cfg.damage;
        this.radius = 11;
        this.dead = false;
        this.hitEntities = new Set();
        this.x = this.startX;
        this.y = this.startY;
        this.prevX = this.startX;
        this.prevY = this.startY;
        this.angle = Math.atan2(this.targetY - this.startY, this.targetX - this.startX);
        this.isEnhanced = cfg.isEnhanced || false;
        this.refundedCd = 0;

        if (typeof getAnimFrames === 'function') {
            getAnimFrames('Projectiles/Boomerang', 15);
            getAnimFrames('Pickups and UI/Damage Pop', 8);
        }
    }

    update(dt) {
        this.prevX = this.x;
        this.prevY = this.y;
        this.time += dt;
        this.animTime += dt;
        let t = Math.min(1.0, this.time / this.duration);

        let lx = this.startX + (this.targetX - this.startX) * t;
        let ly = this.startY + (this.targetY - this.startY) * t;

        let dx = this.targetX - this.startX;
        let dy = this.targetY - this.startY;
        let dist = Math.hypot(dx, dy);
        let nx = -dy / (dist || 1);
        let ny = dx / (dist || 1);

        let offset = 4 * t * (1 - t) * this.curvature;
        this.x = lx + nx * offset;
        this.y = ly + ny * offset;

        let moveDist = Math.hypot(this.x - this.prevX, this.y - this.prevY);
        if (moveDist > 0.001) {
            this.angle = Math.atan2(this.y - this.prevY, this.x - this.prevX);
        }

        for (let enemy of gameState.enemies) {
            if (enemy.dead || this.hitEntities.has(enemy)) continue;
            let d = Math.hypot(this.x - enemy.x, this.y - enemy.y);
            if (d <= this.radius + enemy.radius) {
                this.hitEntities.add(enemy);
                enemy.takeDamage(this.damage, 'magic', this.owner, false, 'skill');
                processItemOnHitPassives(this.owner, enemy, { attackType: 'skill' });

                if (typeof spawnAnimatedEffect === 'function') {
                    spawnAnimatedEffect('Pickups and UI/Damage Pop', enemy.x, enemy.y, {
                        scale: (this.isEnhanced ? 1.3 : 1.1) * 1.35,
                        fps: 22,
                        rotation: Math.random() * Math.PI * 2
                    });
                }

                if (!this.isEnhanced && this.refundedCd < 1.0 && this.owner && this.skillKey) {
                    let refundAmt = Math.min(0.5, 1.0 - this.refundedCd);
                    this.refundedCd += refundAmt;
                    this.owner.reduceSkillCooldown(this.skillKey, refundAmt);
                }
            }
        }

        if (t >= 1.0) {
            this.dead = true;
        }
    }

    draw(ctx) {
        if (typeof getValidFrames === 'function') {
            const valid = getValidFrames('Projectiles/Boomerang');
            if (valid.length > 0) {
                const fps = 24;
                const frameIdx = Math.floor(this.animTime * fps) % valid.length;
                const img = valid[frameIdx];
                if (img && img.naturalWidth > 0) {
                    ctx.save();
                    ctx.translate(this.x, this.y);
                    ctx.rotate(this.angle);

                    let scale = (this.isEnhanced ? 1.35 : 1.15) * 1.35;
                    let w = img.naturalWidth * scale;
                    let h = img.naturalHeight * scale;
                    ctx.drawImage(img, -w / 2, -h / 2, w, h);
                    ctx.restore();
                    return;
                }
            }
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.isEnhanced ? '#ff3838' : '#be2edd';
        ctx.fillRect(-8, -4, 16, 8);
        ctx.restore();
    }
}

// === TƯỚNG WIRDOR ===
class Wirdor extends PlayerHero {
    constructor(id, x, y, extraConfig = {}) {
        super(id, x, y, {
            maxHp: 480,
            ad: 32,
            ap: 45,
            attackSpeed: 1.10,
            speed: 3.85,
            armor: 22,
            mr: 26,
            critRate: 10,
            ...extraConfig
        });
        this.heroType = 'wirdor';
        this.color = id === 1 ? '#9b59b6' : '#8e44ad';

        this.basicRange = 450;
        this.farRange = 450;
        this.nearRange = 340;

        this.passiveStacks = 0;
        this.passiveTimer = 0;

        this.maxCooldowns = { '1': 10.0, '2': 10.0, '3': 10.0 };
        this.manaCosts = { '1': 25, '2': 35, '3': 55 };

        this.baseCooldowns = { '1': 0, '2': 0 };

        this.isDashing = false;
        this.dashVx = 0;
        this.dashVy = 0;
        this.dashTimer = 0;

        if (typeof getAnimFrames === 'function') {
            getAnimFrames('Projectiles/Boomerang', 15);
            getAnimFrames('Hit Sparks/Critical Star', 8);
            getAnimFrames('Pickups and UI/Damage Pop', 8);
            getAnimFrames('Magic/Buff Up', 8);
        }
    }

    reduceSkillCooldown(skillKey, amount) {
        if (this.passiveStacks === 2) {
            if (this.baseCooldowns[skillKey] > 0) {
                this.baseCooldowns[skillKey] = Math.max(0, this.baseCooldowns[skillKey] - amount);
            }
        } else {
            if (this.cooldowns[skillKey] > 0) {
                this.cooldowns[skillKey] = Math.max(0, this.cooldowns[skillKey] - amount);
            }
        }
    }

    activateEnhancedState() {
        this.passiveStacks = 2;
        this.passiveTimer = 5.0;
        this.baseCooldowns['1'] = this.cooldowns['1'];
        this.baseCooldowns['2'] = this.cooldowns['2'];
        this.cooldowns['1'] = 0;
        this.cooldowns['2'] = 0;
    }

    endEnhancedState() {
        this.passiveStacks = 0;
        this.passiveTimer = 0;
        this.cooldowns['1'] = this.baseCooldowns['1'];
        this.cooldowns['2'] = this.baseCooldowns['2'];
    }

    addPassiveStack() {
        if (this.passiveStacks < 2) {
            this.passiveStacks++;
            if (this.passiveStacks === 2) {
                this.activateEnhancedState();
            }
        }
    }

    update(dt) {
        if (this.dead) return;
        this.stats.update(dt);
        if (!this.isResting) this.gold += 3 * dt;
        if (this.attackCooldown > 0) this.attackCooldown -= dt;
        if (this.stunTimer > 0) this.stunTimer -= dt;
        for (let k in this.itemCooldowns) {
            if (this.itemCooldowns[k] > 0) this.itemCooldowns[k] -= dt;
        }

        if (this.cooldowns['3'] > 0) this.cooldowns['3'] -= dt;

        if (this.passiveStacks === 2) {
            if (this.baseCooldowns['1'] > 0) this.baseCooldowns['1'] -= dt;
            if (this.baseCooldowns['2'] > 0) this.baseCooldowns['2'] -= dt;

            this.passiveTimer -= dt;
            if (this.passiveTimer <= 0) {
                this.endEnhancedState();
            }
        } else {
            if (this.cooldowns['1'] > 0) this.cooldowns['1'] -= dt;
            if (this.cooldowns['2'] > 0) this.cooldowns['2'] -= dt;
        }

        if (this.isDashing) {
            this.dashTimer -= dt;
            this.x += this.dashVx * dt * 60;
            this.y += this.dashVy * dt * 60;
            this.x = Math.max(20, Math.min(WORLD_WIDTH - 20, this.x));
            this.y = Math.max(20, Math.min(WORLD_HEIGHT - 20, this.y));

            if (this.dashTimer <= 0) {
                this.isDashing = false;
            }
        }
    }

    castBasicAttack(targetAngle) {
        if (this.attackCooldown > 0 || this.stunTimer > 0 || this.isResting || this.isDashing) return;
        this.attackCooldown = this.stats.attackSpeed;
        this.angle = targetAngle;

        let baseDmg = this.stats.ad * 1.0;
        let isCrit = (Math.random() * 100 < this.stats.critRate);
        if (isCrit) baseDmg *= (2.0 + this.stats.critDamage / 100);

        gameState.projectiles.push(new Projectile({
            owner: this,
            attackType: 'basic_attack',
            x: this.x + Math.cos(targetAngle) * 16,
            y: this.y + Math.sin(targetAngle) * 16,
            vx: Math.cos(targetAngle), vy: Math.sin(targetAngle),
            radius: 6,
            speed: 13,
            damage: baseDmg,
            dmgType: 'physical',
            color: '#be2edd',
            isCrit: isCrit,
            range: this.basicRange,
            spriteFolder: 'Projectiles/Energy Bolt',
            spriteScale: 0.95 * 1.35,
            hitEffect: 'Pickups and UI/Damage Pop',
            hitEffectScale: 1.15 * 1.35
        }));
    }

    fireBlades(skillKey, targetAngle, rangeDist) {
        let isEnhanced = (this.passiveStacks === 2);
        let actualCd = this.maxCooldowns[skillKey] * (1 - Math.min(0.4, this.stats.cdr));

        if (isEnhanced) {
            this.baseCooldowns[skillKey] = actualCd;
            this.endEnhancedState();
        } else {
            this.cooldowns[skillKey] = actualCd;
            this.addPassiveStack();
        }

        let tx = this.x + Math.cos(targetAngle) * rangeDist;
        let ty = this.y + Math.sin(targetAngle) * rangeDist;
        let singleBladeDmg = this.stats.ap * 0.40;

        let curveOffsets = isEnhanced ? [-135, -55, 55, 135] : [-85, 85];

        curveOffsets.forEach(offset => {
            gameState.projectiles.push(new CurvedBladeProjectile({
                owner: this,
                skillKey: skillKey,
                startX: this.x,
                startY: this.y,
                targetX: tx,
                targetY: ty,
                curvature: offset,
                duration: rangeDist / 750,
                damage: singleBladeDmg,
                isEnhanced: isEnhanced
            }));
        });

        let travelTime = (rangeDist / 750) * 1000;
        setTimeout(() => {
            if (typeof spawnAnimatedEffect === 'function') {
                spawnAnimatedEffect('Hit Sparks/Critical Star', tx, ty, {
                    scale: (isEnhanced ? 1.45 : 1.15) * 1.35,
                    fps: 22,
                    rotation: Math.random() * Math.PI * 2
                });
            }

            let convergeDmg = singleBladeDmg * 4;
            gameState.enemies.forEach(enemy => {
                let hitRadius = isEnhanced ? 55 : 45;
                if (!enemy.dead && Math.hypot(enemy.x - tx, enemy.y - ty) <= hitRadius) {
                    enemy.takeDamage(convergeDmg, 'magic', this, false, 'skill');

                    if (typeof spawnAnimatedEffect === 'function') {
                        spawnAnimatedEffect('Pickups and UI/Damage Pop', enemy.x, enemy.y, {
                            scale: 1.25 * 1.35,
                            fps: 22,
                            rotation: Math.random() * Math.PI * 2
                        });
                    }
                }
            });
        }, travelTime);
    }

    castSkill1(targetAngle) {
        if (this.cooldowns['1'] > 0 || this.stats.mana < this.manaCosts['1'] || this.isResting || this.isDashing) return;
        this.stats.mana -= this.manaCosts['1'];
        this.angle = targetAngle;
        this.fireBlades('1', targetAngle, this.nearRange);
    }

    castSkill2(targetAngle) {
        if (this.cooldowns['2'] > 0 || this.stats.mana < this.manaCosts['2'] || this.isResting || this.isDashing) return;
        this.stats.mana -= this.manaCosts['2'];
        this.angle = targetAngle;
        this.fireBlades('2', targetAngle, this.farRange);
    }

    castSkill3(targetAngle) {
        if (this.cooldowns['3'] > 0 || this.stats.mana < this.manaCosts['3'] || this.isResting || this.isDashing) return;
        this.stats.mana -= this.manaCosts['3'];
        this.cooldowns['3'] = this.maxCooldowns['3'] * (1 - Math.min(0.4, this.stats.cdr));
        this.angle = targetAngle;

        let dashDist = 200;
        let dashDuration = 0.20;
        let backwardAngle = targetAngle + Math.PI;

        this.isDashing = true;
        this.dashTimer = dashDuration;
        this.dashVx = Math.cos(backwardAngle) * (dashDist / dashDuration / 60);
        this.dashVy = Math.sin(backwardAngle) * (dashDist / dashDuration / 60);

        setTimeout(() => {
            if (this.dead) return;
            this.fireStraightSlash(targetAngle);
        }, 120);
    }

    fireStraightSlash(slashAngle) {
        let slashLength = this.nearRange;
        let slashWidth = 55;
        let fx = Math.cos(slashAngle);
        let fy = Math.sin(slashAngle);

        let frameRotation = slashAngle + Math.PI / 2;
        let stepDist = 48;
        let totalSteps = Math.floor(slashLength / stepDist);

        for (let i = 1; i <= totalSteps; i++) {
            let px = this.x + fx * (i * stepDist);
            let py = this.y + fy * (i * stepDist);
            setTimeout(() => {
                if (typeof spawnAnimatedEffect === 'function') {
                    spawnAnimatedEffect('Magic/Buff Up', px, py, {
                        scale: 1.25 * 1.35,
                        fps: 24,
                        rotation: frameRotation
                    });
                }
            }, (i - 1) * 16);
        }

        let slashDmg = this.stats.ap * 1.0;

        gameState.enemies.forEach(enemy => {
            if (enemy.dead) return;
            let toX = enemy.x - this.x;
            let toY = enemy.y - this.y;
            let proj = toX * fx + toY * fy;

            if (proj >= 0 && proj <= slashLength) {
                let perpDist = Math.abs(toX * (-fy) + toY * fx);
                if (perpDist <= slashWidth / 2 + enemy.radius) {
                    enemy.x += fx * 90;
                    enemy.y += fy * 90;
                    enemy.stunTimer = 1.0;
                    enemy.takeDamage(slashDmg, 'magic', this, false, 'skill');

                    if (typeof spawnAnimatedEffect === 'function') {
                        spawnAnimatedEffect('Pickups and UI/Damage Pop', enemy.x, enemy.y, {
                            scale: 1.25 * 1.35,
                            fps: 22,
                            rotation: Math.random() * Math.PI * 2
                        });
                    }
                }
            }
        });
    }

    draw(ctx) {
        if (this.dead) return;

        ctx.save();
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.nearRange, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(190, 46, 221, 0.28)";
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.farRange, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(104, 109, 224, 0.22)";
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.passiveStacks === 2 ? '#ff3838' : this.color;
        ctx.shadowBlur = this.passiveStacks === 2 ? 16 : 8;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.passiveStacks === 2 ? '#ff1744' : '#be2edd';
        ctx.beginPath();
        ctx.moveTo(this.radius + 12, 0);
        ctx.lineTo(this.radius - 2, -5);
        ctx.lineTo(this.radius + 2, 0);
        ctx.lineTo(this.radius - 2, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        let bW = 14;
        let bH = 6;
        let skew = 4;
        let startX = this.x - bW - 2;
        let startY = this.y - this.radius - 14;

        for (let i = 0; i < 2; i++) {
            let px = startX + i * (bW + 4);
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(px + skew, startY);
            ctx.lineTo(px + bW + skew, startY);
            ctx.lineTo(px + bW, startY + bH);
            ctx.lineTo(px, startY + bH);
            ctx.closePath();

            let isFilled = (i < this.passiveStacks);
            if (isFilled) {
                ctx.fillStyle = this.passiveStacks === 2 ? '#ff3838' : '#be2edd';
                ctx.shadowColor = ctx.fillStyle;
                ctx.shadowBlur = 6;
            } else {
                ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
            }
            ctx.fill();
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        }

        this.drawBatPet(ctx);
    }
}

// === TƯỚNG GOROX ===
class Gorox extends PlayerHero {
    constructor(id, x, y, extraConfig = {}) {
        super(id, x, y, {
            maxHp: 490,
            hpRegen: 2.8,
            maxMana: 0,
            manaRegen: 0,
            ad: 34,
            ap: 0,
            attackSpeed: 1.0,
            speed: 3.9,
            armor: 24,
            mr: 20,
            armorPen: 0,
            magicPen: 0,
            cdr: 0,
            lifesteal: 0,
            spellVamp: 0,
            critRate: 5,
            critDamage: 0,
            ...extraConfig
        });
        this.heroType = 'gorox';
        this.color = id === 1 ? '#e67e22' : '#d35400';

        this.elementMode = 'fire';
        this.elementList = ['fire', 'lightning', 'ice'];

        this.maxCooldowns = { '1': 0.8, '2': 8.0, '3': 14.0 };
        this.manaCosts = { '1': 0, '2': 0, '3': 0 };

        this.s2Timer = 0;
        this.s2Duration = 1.5;
        this.s2TrailTimer = 0;

        this.isChannelingUlt = false;
        this.ultDuration = 3.0;
        this.ultTimer = 0;
        this.ultBulletsLeft = 0;
        this.ultBulletInterval = 3.0 / 60;
        this.ultBulletTimer = 0;
        this.ultTargetAngle = 0;

        this.auraAnimTime = 0;

        if (typeof getAnimFrames === 'function') {
            getAnimFrames('Fire/Fire Ring', 16);
            getAnimFrames('Lightning/Shock Aura', 16);
            getAnimFrames('Magic/Shield Bubble', 16);
            getAnimFrames('Projectiles/Fireball Shot', 8);
            getAnimFrames('Fire/Phoenix Flare', 7);
            getAnimFrames('Lightning/Plasma Orb', 8);
            getAnimFrames('Lightning/Zap Ring', 5);
            getAnimFrames('Lightning/Thunder Impact', 7);
            getAnimFrames('IceSpear', 10);
            getAnimFrames('IceShoot', 8);
            getAnimFrames('Fire/Burning Ground', 16);
            getAnimFrames('Lightning/Electric Shock', 5);
            getAnimFrames('Projectiles/Bullet Tracer', 11);
            getAnimFrames('Ambient/Wind Lines', 19);
        }
    }

    getArmorPen() {
        let pen = this.stats.armorPen;
        if (this.s2Timer > 0) {
            pen *= 2;
        }
        return pen;
    }

    getActualSpeed() {
        let s = this.stats.speed;
        if (this.s2Timer > 0) {
            let progress = this.s2Timer / this.s2Duration;
            s += 1.0 * progress;
        }
        return s;
    }

    update(dt) {
        super.update(dt);
        this.auraAnimTime += dt;

        if (this.s2Timer > 0) {
            this.s2Timer -= dt;
            this.s2TrailTimer -= dt;
            if (this.s2TrailTimer <= 0) {
                this.s2TrailTimer = 0.12;
                if (typeof spawnAnimatedEffect === 'function') {
                    spawnAnimatedEffect('Ambient/Wind Lines', this.x, this.y, {
                        scale: 1.15 * 1.35,
                        fps: 24,
                        rotation: this.angle + Math.PI
                    });
                }
            }
        }

        if (this.isChannelingUlt) {
            this.ultTimer -= dt;
            this.ultBulletTimer -= dt;

            while (this.ultBulletTimer <= 0 && this.ultBulletsLeft > 0) {
                this.ultBulletTimer += this.ultBulletInterval;
                this.ultBulletsLeft--;
                this.fireSingleUltBullet(this.ultTargetAngle);
            }

            if (this.ultTimer <= 0 || this.ultBulletsLeft <= 0 || this.dead || this.stunTimer > 0) {
                this.isChannelingUlt = false;
            }
        }
    }

    castBasicAttack(targetAngle) {
        if (this.attackCooldown > 0 || this.stunTimer > 0 || this.isResting || this.isChannelingUlt) return;
        this.attackCooldown = this.stats.attackSpeed;
        this.angle = targetAngle;
        
        if (window.mapProps && window.mapProps.isEntityInBush(this)) {
            if (typeof onPlayerGunshotInBush === 'function') {
                onPlayerGunshotInBush(this);
            }
        }
        this.fireGoroxBullet(targetAngle, 1);

        let asScale = 1 + this.attackSpeedBonus;
        let delayMs = (0.3 / asScale) * 1000;

        setTimeout(() => {
            if (this.dead || this.isResting) return;
            this.fireGoroxBullet(targetAngle, 2);
        }, delayMs);
    }

    fireGoroxBullet(angle, shotIndex) {
        let baseDmg = this.stats.ad * 0.33;
        let isCrit = (Math.random() * 100 < this.stats.critRate);
        if (isCrit) baseDmg *= (2.0 + this.stats.critDamage / 100);

        let speed = 14;
        let color = '#f39c12';
        let range = 460;

        let spriteFolder = 'Projectiles/Fireball Shot';
        let spriteScale = 0.95 * 1.35;
        let hitScale = 1.25 * 1.35;

        if (this.elementMode === 'fire') {
            color = '#ff4757';
            spriteFolder = 'Fire/Phoenix Flare';
            spriteScale = 0.95 * 1.35;
            hitScale = 1.25 * 1.35;
        } else if (this.elementMode === 'lightning') {
            color = '#f1c40f';
            spriteFolder = 'Lightning/Plasma Orb';
            spriteScale = 1.0 * 1.35;
            hitScale = 1.25 * 1.35;
        } else if (this.elementMode === 'ice') {
            color = '#00d2d3';
            spriteFolder = 'IceSpear';
            spriteScale = 1.15 * 1.35;
            hitScale = 1.35 * 1.35;
        }

        gameState.projectiles.push(new Projectile({
            owner: this,
            attackType: 'basic_attack',
            x: this.x + Math.cos(angle) * 18,
            y: this.y + Math.sin(angle) * 18,
            vx: Math.cos(angle), vy: Math.sin(angle),
            radius: 6,
            speed: speed,
            damage: baseDmg,
            dmgType: 'physical',
            color: color,
            isCrit: isCrit,
            range: range,
            spriteFolder: spriteFolder,
            spriteScale: spriteScale,
            onHitExtra: (target) => {
                if (this.elementMode === 'fire') {
                    if (target.dead) return;
                    let burnPerSec = this.stats.ad * 0.10;
                    target.burnDmg = burnPerSec;
                    target.burnAttacker = this;
                    target.burnTimer = 5.0;
                    target.burnTickTimer = 1.0;
                    target.takeDamage(burnPerSec, 'true', this, false, 'dot');

                    if (!target.dead && (!target.burnFx || target.burnFx.dead)) {
                        if (typeof spawnAnimatedEffect === 'function') {
                            target.burnFx = spawnAnimatedEffect('Fire/Burning Ground', target.x, target.y, {
                                scale: 1.35,
                                fps: 18,
                                loop: true,
                                rotation: 0,
                                followTarget: target
                            });
                        }
                    }
                } else if (this.elementMode === 'lightning') {
                    spawnThunderImpactOnTarget(this, target, this.stats.ad * 0.05, () => {
                        triggerLightningChain(this, target);
                    });
                } else if (this.elementMode === 'ice') {
                    target.applySlow(0.30, 3.0);
                    if (typeof spawnAnimatedEffect === 'function') {
                        spawnAnimatedEffect('IceShoot', target.x, target.y, {
                            scale: hitScale,
                            fps: 22,
                            rotation: angle,
                            originX: 0.0,
                            originY: 0.5
                        });
                    }

                    let coneHalfAngle = Math.PI / 12;
                    let coneRadius = target.radius;

                    gameState.enemies.forEach(sub => {
                        if (sub.dead || sub === target) return;
                        let d = Math.hypot(sub.x - target.x, sub.y - target.y);
                        if (d <= coneRadius + sub.radius) {
                            let angleToSub = Math.atan2(sub.y - target.y, sub.x - target.x);
                            let diff = Math.atan2(Math.sin(angleToSub - angle), Math.cos(angleToSub - angle));
                            if (Math.abs(diff) <= coneHalfAngle) {
                                sub.applySlow(0.20, 2.0);
                            }
                        }
                    });
                }
            }
        }));
    }

    castSkill1() {
        if (this.cooldowns['1'] > 0 || this.isResting) return;
        this.cooldowns['1'] = this.maxCooldowns['1'] * (1 - Math.min(0.4, this.stats.cdr));

        let curIdx = this.elementList.indexOf(this.elementMode);
        let nextIdx = (curIdx + 1) % this.elementList.length;
        this.elementMode = this.elementList[nextIdx];
        this.auraAnimTime = 0;
    }

    castSkill2() {
        if (this.cooldowns['2'] > 0 || this.isResting) return;
        this.cooldowns['2'] = this.maxCooldowns['2'] * (1 - Math.min(0.4, this.stats.cdr));
        this.s2Timer = this.s2Duration;
        this.s2TrailTimer = 0;

        if (typeof spawnAnimatedEffect === 'function') {
            spawnAnimatedEffect('Ambient/Wind Lines', this.x, this.y, {
                scale: 1.5 * 1.35,
                fps: 24,
                rotation: this.angle
            });
        }
    }

    castSkill3(targetAngle) {
        if (this.cooldowns['3'] > 0 || this.isResting || this.isChannelingUlt) return;
        this.cooldowns['3'] = this.maxCooldowns['3'] * (1 - Math.min(0.4, this.stats.cdr));

        this.isChannelingUlt = true;
        this.ultDuration = 3.0;
        this.ultTimer = 3.0;
        this.ultBulletsLeft = 60;
        this.ultBulletInterval = 3.0 / 60;
        this.ultBulletTimer = 0;
        this.ultTargetAngle = targetAngle;
    }

    fireSingleUltBullet(centerAngle) {
        let degSpread = (2 + Math.random() * 5) * (Math.PI / 180);
        let sign = Math.random() < 0.5 ? -1 : 1;
        let bulletAngle = centerAngle + degSpread * sign;

        let dmg = this.stats.ad * 0.25;
        let isCrit = (Math.random() * 100 < this.stats.critRate);
        if (isCrit) dmg *= (2.0 + this.stats.critDamage / 100);

        gameState.projectiles.push(new Projectile({
            owner: this,
            attackType: 'skill',
            x: this.x + Math.cos(bulletAngle) * 18,
            y: this.y + Math.sin(bulletAngle) * 18,
            vx: Math.cos(bulletAngle), vy: Math.sin(bulletAngle),
            radius: 5,
            speed: 16.5,
            damage: dmg,
            dmgType: 'physical',
            color: '#ffa502',
            isCrit: isCrit,
            range: 520,
            spriteFolder: 'Projectiles/Bullet Tracer',
            spriteScale: 0.90 * 1.35,
            hitEffect: 'Hit Sparks/Shock Hit',
            hitEffectScale: 1.05 * 1.35
        }));
    }

    draw(ctx) {
        if (this.dead) return;

        let auraFolder = 'Fire/Fire Ring';
        if (this.elementMode === 'lightning') auraFolder = 'Lightning/Shock Aura';
        else if (this.elementMode === 'ice') auraFolder = 'Magic/Shield Bubble';

        if (typeof getValidFrames === 'function') {
            const valid = getValidFrames(auraFolder);
            if (valid.length > 0) {
                const fps = 18;
                const frameIdx = Math.floor(this.auraAnimTime * fps) % valid.length;
                const img = valid[frameIdx];
                if (img && img.naturalWidth > 0) {
                    ctx.save();
                    ctx.translate(this.x, this.y);
                    let targetSize = (this.radius * 2.8) * 1.35;
                    let scale = targetSize / img.naturalWidth;
                    let w = img.naturalWidth * scale;
                    let h = img.naturalHeight * scale;
                    ctx.drawImage(img, -w / 2, -h / 2, w, h);
                    ctx.restore();
                }
            }
        }

        let elemColor = this.elementMode === 'fire' ? '#ff4757' : (this.elementMode === 'lightning' ? '#f1c40f' : '#00d2d3');

        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowColor = elemColor;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = "#2c3e50";
        ctx.fillRect(this.radius - 2, -6, 15, 4);
        ctx.fillRect(this.radius - 2, 2, 15, 4);
        ctx.fillStyle = elemColor;
        ctx.fillRect(this.radius + 9, -5, 4, 2);
        ctx.fillRect(this.radius + 9, 3, 4, 2);
        ctx.restore();

        let badgeText = this.elementMode === 'fire' ? '🔥 LỬA' : (this.elementMode === 'lightning' ? '⚡ ĐIỆN' : '❄ BĂNG');
        ctx.save();
        ctx.font = "bold 9px Arial";
        ctx.fillStyle = elemColor;
        ctx.textAlign = "center";
        ctx.fillText(badgeText, this.x, this.y - this.radius - 10);
        ctx.restore();

        this.drawBatPet(ctx);
    }
}

// === CƠ CHẾ SÉT LAN MỚI CỦA GOROX ===
function triggerLightningChain(owner, primaryTarget) {
    let ad = owner.stats.ad;
    let visited = new Set([primaryTarget]);

    let candidates = gameState.enemies.filter(e => !e.dead && e !== primaryTarget && Math.hypot(e.x - primaryTarget.x, e.y - primaryTarget.y) <= 180);
    candidates.sort((a, b) => Math.hypot(a.x - primaryTarget.x, a.y - primaryTarget.y) - Math.hypot(b.x - primaryTarget.x, b.y - primaryTarget.y));
    let firstBranchTargets = candidates.slice(0, 2);

    firstBranchTargets.forEach(target1 => {
        visited.add(target1);
        drawCyanLightningBoltVFX(primaryTarget.x, primaryTarget.y, target1.x, target1.y);
        target1.takeDamage(ad * 0.03, 'magic', owner, false, 'skill');

        if (typeof spawnAnimatedEffect === 'function') {
            spawnAnimatedEffect('Lightning/Electric Shock', target1.x, target1.y, {
                scale: 1.25,
                fps: 20,
                rotation: Math.random() * Math.PI * 2
            });
        }
    });

    if (firstBranchTargets.length > 0) {
        let branchOrigin = firstBranchTargets[0];
        let nextCandidates = gameState.enemies.filter(e => !e.dead && !visited.has(e) && Math.hypot(e.x - branchOrigin.x, e.y - branchOrigin.y) <= 180);
        nextCandidates.sort((a, b) => Math.hypot(a.x - branchOrigin.x, a.y - branchOrigin.y) - Math.hypot(b.x - branchOrigin.x, b.y - branchOrigin.y));

        if (nextCandidates.length > 0) {
            let target2 = nextCandidates[0];
            visited.add(target2);
            drawCyanLightningBoltVFX(branchOrigin.x, branchOrigin.y, target2.x, target2.y);
            target2.takeDamage(ad * 0.01, 'magic', owner, false, 'skill');

            if (typeof spawnAnimatedEffect === 'function') {
                spawnAnimatedEffect('Lightning/Electric Shock', target2.x, target2.y, {
                    scale: 1.25,
                    fps: 20,
                    rotation: Math.random() * Math.PI * 2
                });
            }
        }
    }
}

function spawnThunderImpactOnTarget(owner, target, damageAmount, onHitCallback = null) {
    if (!target || target.dead) return;

    let enemySize = target.radius * 2;
    let effectScale = (enemySize * 2.5 / 48) * 1.35;
    let offsetY = -target.radius * 0.20;

    if (typeof spawnAnimatedEffect === 'function') {
        spawnAnimatedEffect('Lightning/Thunder Impact', target.x, target.y + offsetY, {
            scale: effectScale,
            fps: 18,
            rotation: 0,
            followTarget: target,
            offsetY: offsetY,
            onFrame: (currentFrame) => {
                if (currentFrame === 4 && target && !target.dead) {
                    target.takeDamage(damageAmount, 'magic', owner, false, 'skill');
                    if (onHitCallback) onHitCallback();
                }
            }
        });
    }
}

function drawCyanLightningBoltVFX(x1, y1, x2, y2) {
    let steps = 5;
    let lx = x1;
    let ly = y1;
    for (let i = 1; i <= steps; i++) {
        let t = i / steps;
        let nx = x1 + (x2 - x1) * t + (i < steps ? (Math.random() - 0.5) * 18 : 0);
        let ny = y1 + (y2 - y1) * t + (i < steps ? (Math.random() - 0.5) * 18 : 0);

        gameState.particles.push({
            type: 'lightning_segment',
            x1: lx, y1: ly, x2: nx, y2: ny,
            color: '#00e5ff',
            alpha: 1.0,
            life: 0.18
        });
        lx = nx;
        ly = ny;
    }
}

function drawLightningBoltVFX(x1, y1, x2, y2) {
    let steps = 4;
    let lx = x1;
    let ly = y1;
    for (let i = 1; i <= steps; i++) {
        let t = i / steps;
        let nx = x1 + (x2 - x1) * t + (i < steps ? (Math.random() - 0.5) * 20 : 0);
        let ny = y1 + (y2 - y1) * t + (i < steps ? (Math.random() - 0.5) * 20 : 0);

        gameState.particles.push({
            type: 'lightning_segment',
            x1: lx, y1: ly, x2: nx, y2: ny,
            color: '#f1c40f',
            alpha: 1.0,
            life: 0.15
        });
        lx = nx;
        ly = ny;
    }
}