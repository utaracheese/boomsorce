// ==========================================================================
// FILE: monsters.js - HỆ THỐNG CẤU HÌNH, TRÍ TUỆ NHÂN TẠO, QUÁI VẬT & BOSS
// ==========================================================================

const MONSTER_VISION_RADIUS = 1000;

function isPlayerVisibleToMonster(monster, player) {
    if (!player || player.dead || player.isResting) return false;
    let dist = Math.hypot(player.x - monster.x, player.y - monster.y);
    if (dist > MONSTER_VISION_RADIUS) return false;

    if (!window.mapProps) return true;

    let playerBush = window.mapProps.isEntityInBush(player);
    if (!playerBush) return true;

    let monsterBush = window.mapProps.isEntityInBush(monster);
    let inSameBush = (monsterBush === playerBush);
    return inSameBush || (dist <= 85);
}

class SmartMonster extends Monster {
    constructor(x, y, radius, color, stats) {
        super(x, y, radius, color, stats);

        this.aiState = 'idle_wander';
        this.wanderTimer = Math.random() * 3 + 2;
        this.wanderDir = Math.random() * Math.PI * 2;
        this.isPausing = false;
        this.pauseTimer = 0;
        this.punchEnvCooldown = 0;

        this.lastKnownPos = null;
        this.searchTimer = 0;
        this.searchSubTimer = 0;

        this.alertTimer = 0;
        this.alertTargetPos = null;
        this.alertPhase = 0;
        this.hasRespondedToHit = false;

        this.brawlTarget = null;
        this.brawlTimer = 0;
        this.brawlAtkTimer = 0;
        this.canInitiateBrawl = true;

        this.isStalker = false;
        this.stalkerBush = null;

        this.noiseOffset = Math.random() * 1000;
        this.currentVelocity = { x: 0, y: 0 };
        this.hpBarColor = '#2ecc71';
    }

    drawHpBar(ctx) {
        let hasShield = this.shield > 0;
        if ((this.stats.hp < this.stats.maxHp || hasShield) && this.stats.hp > 0) {
            let barW = Math.max(30, this.radius * 2);
            let barH = this.isBoss ? 6 : 4;
            let barX = this.x - barW / 2;
            let barY = this.y - this.radius - 10;

            let maxDisplay = Math.max(this.stats.maxHp, this.stats.hp + (this.shield || 0));
            let hpRatio = Math.max(0, this.stats.hp / maxDisplay);
            let shieldRatio = Math.max(0, (this.shield || 0) / maxDisplay);

            ctx.save();
            ctx.fillStyle = "rgba(0, 0, 0, 0.78)";
            ctx.fillRect(barX, barY, barW, barH);

            ctx.fillStyle = this.hpBarColor || "#2ecc71";
            ctx.fillRect(barX, barY, barW * hpRatio, barH);

            if (shieldRatio > 0) {
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(barX + barW * hpRatio, barY, barW * shieldRatio, barH);
            }

            ctx.strokeStyle = "#000";
            ctx.lineWidth = 0.8;
            ctx.strokeRect(barX, barY, barW, barH);
            ctx.restore();
        }
    }

    resolveMonsterOverlap() {
        if (this.dead) return;
        for (let other of gameState.enemies) {
            if (other === this || other.dead || other.monsterType === 'dummy') continue;
            let dx = other.x - this.x;
            let dy = other.y - this.y;
            let dist = Math.hypot(dx, dy);

            let minDistance = (this.radius + other.radius) * 0.85;

            if (dist < minDistance) {
                if (!this.isBoss && !other.isBoss &&
                    this.canInitiateBrawl && other.canInitiateBrawl &&
                    this.aiState === 'idle_wander' && other.aiState === 'idle_wander' &&
                    !this.currentTarget && !other.currentTarget) {
                    if (Math.random() < 0.80) {
                        this.triggerBrawl(other);
                        other.triggerBrawl(this);
                        continue;
                    }
                }

                let overlap = minDistance - dist;
                let nx = dist > 0.001 ? (dx / dist) : (Math.random() - 0.5);
                let ny = dist > 0.001 ? (dy / dist) : (Math.random() - 0.5);

                let pushSpeed = 1.6;
                this.x -= nx * overlap * 0.5 * pushSpeed * 0.15;
                this.y -= ny * overlap * 0.5 * pushSpeed * 0.15;
                other.x += nx * overlap * 0.5 * pushSpeed * 0.15;
                other.y += ny * overlap * 0.5 * pushSpeed * 0.15;
            }
        }
    }

    triggerBrawl(other) {
        this.aiState = 'brawling';
        this.brawlTarget = other;
        this.brawlTimer = 7 + Math.random() * 3;
        this.brawlAtkTimer = 2 + Math.random() * 2;
        this.canInitiateBrawl = false;

        gameState.enemies.forEach(m => {
            if (m !== this && m !== other && !m.dead && !m.isBoss && m.aiState === 'idle_wander') {
                if (Math.hypot(m.x - this.x, m.y - this.y) <= 450) {
                    m.aiState = 'alert';
                    m.alertTargetPos = { x: this.x + (Math.random() - 0.5) * 60, y: this.y + (Math.random() - 0.5) * 60 };
                    m.alertPhase = 1;
                    m.alertTimer = 4.0;
                    m.canInitiateBrawl = false;
                }
            }
        });
    }

    calculateSteering(targetX, targetY, dt) {
        this.noiseOffset += dt * 3.0;
        let baseAngle = Math.atan2(targetY - this.y, targetX - this.x);
        let noiseAngle = Math.sin(this.noiseOffset) * 0.45;
        let moveAngle = baseAngle + noiseAngle;

        if (window.mapProps && window.mapProps.solids) {
            let lookAheadDist = 65;
            let checkX = this.x + Math.cos(baseAngle) * lookAheadDist;
            let checkY = this.y + Math.sin(baseAngle) * lookAheadDist;

            for (let prop of window.mapProps.solids) {
                let d = Math.hypot(checkX - prop.x, checkY - prop.y);
                let hitDist = (prop.def.hitboxRadius || prop.def.bW || 20) + this.radius + 15;
                if (d < hitDist) {
                    let toProp = Math.atan2(prop.y - this.y, prop.x - this.x);
                    let diff = baseAngle - toProp;
                    if (diff > 0) moveAngle += Math.PI * 0.38;
                    else moveAngle -= Math.PI * 0.38;
                    break;
                }
            }
        }
        return moveAngle;
    }

    updateCommonAI(dt) {
        this.resolveMonsterOverlap();

        if (this.aiState === 'brawling') {
            this.brawlTimer -= dt;
            this.brawlAtkTimer -= dt;

            if (!this.brawlTarget || this.brawlTarget.dead || this.brawlTimer <= 0) {
                this.aiState = 'idle_wander';
                this.brawlTarget = null;
                setTimeout(() => { this.canInitiateBrawl = true; }, 8000);
                return;
            }

            let bDist = Math.hypot(this.brawlTarget.x - this.x, this.brawlTarget.y - this.y);
            if (bDist > 55) {
                let ang = Math.atan2(this.brawlTarget.y - this.y, this.brawlTarget.x - this.x);
                let spd = this.getActualSpeed() * 0.6;
                this.x += Math.cos(ang) * spd;
                this.y += Math.sin(ang) * spd;
            } else if (this.brawlAtkTimer <= 0) {
                this.brawlAtkTimer = 2.5 + Math.random() * 1.5;
                createImpactParticles(this.brawlTarget.x, this.brawlTarget.y, '#f1c40f', 4);
                let ang = Math.atan2(this.y - this.brawlTarget.y, this.x - this.brawlTarget.x);
                this.x += Math.cos(ang) * 15;
                this.y += Math.sin(ang) * 15;
            }
            return;
        }

        let visiblePlayers = gameState.players.filter(p => isPlayerVisibleToMonster(this, p));

        if (this.isStalker && this.stalkerBush) {
            let playerClose = visiblePlayers.some(p => Math.hypot(p.x - this.x, p.y - this.y) <= 160);
            if (!playerClose) return;
            this.isStalker = false;
            this.aiState = 'chasing';
        }

        if (visiblePlayers.length > 0) {
            let target = visiblePlayers.reduce((prev, curr) =>
                Math.hypot(curr.x - this.x, curr.y - this.y) < Math.hypot(prev.x - this.x, prev.y - this.y) ? curr : prev
            );
            this.currentTarget = target;
            this.lastKnownPos = { x: target.x, y: target.y };
            this.aiState = 'chasing';
        } else {
            if (this.aiState === 'chasing' && this.lastKnownPos) {
                this.aiState = 'searching';
                this.searchTimer = 6.0;
                this.searchSubTimer = 0;
                this.currentTarget = null;
            }
        }

        if (this.aiState === 'searching') {
            this.searchTimer -= dt;
            let dToLkp = Math.hypot(this.lastKnownPos.x - this.x, this.lastKnownPos.y - this.y);

            if (dToLkp > 35) {
                let ang = this.calculateSteering(this.lastKnownPos.x, this.lastKnownPos.y, dt);
                let spd = this.getActualSpeed();
                this.x += Math.cos(ang) * spd;
                this.y += Math.sin(ang) * spd;
            } else {
                this.searchSubTimer -= dt;
                if (this.searchSubTimer <= 0) {
                    this.searchSubTimer = 1.0 + Math.random() * 1.5;
                    this.wanderDir = Math.random() * Math.PI * 2;
                }
                let spd = this.getActualSpeed() * 0.65;
                this.x += Math.cos(this.wanderDir) * spd;
                this.y += Math.sin(this.wanderDir) * spd;
            }

            if (this.searchTimer <= 0) {
                this.aiState = 'idle_wander';
                this.lastKnownPos = null;
            }
            return;
        }

        if (this.aiState === 'alert' && this.alertTargetPos) {
            this.alertTimer -= dt;
            if (this.alertPhase === 0) {
                if (this.alertTimer <= 0) {
                    this.alertPhase = 1;
                    this.alertTimer = 3.5;
                }
            } else if (this.alertPhase === 1) {
                let dAlert = Math.hypot(this.alertTargetPos.x - this.x, this.alertTargetPos.y - this.y);
                if (dAlert > 30) {
                    let ang = this.calculateSteering(this.alertTargetPos.x, this.alertTargetPos.y, dt);
                    let spd = this.getActualSpeed() * 0.45;
                    this.x += Math.cos(ang) * spd;
                    this.y += Math.sin(ang) * spd;
                }
                if (this.alertTimer <= 0) {
                    this.aiState = 'idle_wander';
                    this.alertTargetPos = null;
                }
            } else if (this.alertPhase === 2) {
                let dAlert = Math.hypot(this.alertTargetPos.x - this.x, this.alertTargetPos.y - this.y);
                if (dAlert > 30) {
                    let ang = this.calculateSteering(this.alertTargetPos.x, this.alertTargetPos.y, dt);
                    let spd = this.getActualSpeed();
                    this.x += Math.cos(ang) * spd;
                    this.y += Math.sin(ang) * spd;
                }
                if (this.alertTimer <= 0) {
                    this.aiState = 'idle_wander';
                    this.alertTargetPos = null;
                }
            }
            return;
        }

        if (this.aiState === 'idle_wander') {
            if (this.punchEnvCooldown > 0) this.punchEnvCooldown -= dt;

            if (this.isPausing) {
                this.pauseTimer -= dt;
                if (this.pauseTimer <= 0) {
                    this.isPausing = false;
                    this.wanderTimer = 2.5 + Math.random() * 3.5;
                    this.wanderDir = Math.random() * Math.PI * 2;
                }
            } else {
                this.wanderTimer -= dt;
                let spd = this.getActualSpeed() * 0.4;
                let steerAngle = this.calculateSteering(this.x + Math.cos(this.wanderDir) * 100, this.y + Math.sin(this.wanderDir) * 100, dt);
                this.x += Math.cos(steerAngle) * spd;
                this.y += Math.sin(steerAngle) * spd;

                if (this.punchEnvCooldown <= 0 && window.mapProps && window.mapProps.solids) {
                    for (let prop of window.mapProps.solids) {
                        let dProp = Math.hypot(prop.x - this.x, prop.y - this.y);
                        if (dProp <= this.radius + 30) {
                            prop.takeHit(10, this);
                            this.punchEnvCooldown = 3.5;
                            createImpactParticles(prop.x, prop.y, '#d35400', 4);
                            break;
                        }
                    }
                }

                if (this.wanderTimer <= 0) {
                    this.isPausing = true;
                    this.pauseTimer = 1.0 + Math.random() * 2.0;
                }
            }
        }
    }

    takeDamage(amount, type, attacker = null, isCrit = false, source = 'skill') {
        let dmg = super.takeDamage(amount, type, attacker, isCrit, source);

        if (attacker && !attacker.isMonster && !this.dead) {
            this.lastKnownPos = { x: attacker.x, y: attacker.y };
            this.aiState = 'chasing';
            this.currentTarget = attacker;
            notifyNearbyMonstersOnHit(this, attacker);
        }
        return dmg;
    }
}

function notifyNearbyMonstersOnHit(hitMonster, attacker) {
    let attackerBush = window.mapProps ? window.mapProps.isEntityInBush(attacker) : null;
    let alertChance = attackerBush ? 0.07 : 0.15;

    gameState.enemies.forEach(m => {
        if (m === hitMonster || m.dead || m.monsterType === 'dummy') return;
        if (m.aiState === 'chasing' || m.aiState === 'brawling') return;

        let d = Math.hypot(m.x - hitMonster.x, m.y - hitMonster.y);
        if (d <= MONSTER_VISION_RADIUS) {
            if (m.aiState === 'alert' && m.alertPhase === 1) {
                m.alertPhase = 2;
                m.alertTimer = 4.0;
                m.alertTargetPos = { x: attacker.x, y: attacker.y };
            } else if (Math.random() < alertChance) {
                m.aiState = 'alert';
                m.alertPhase = 0;
                m.alertTimer = 1.0;
                m.alertTargetPos = { x: hitMonster.x, y: hitMonster.y };
            }
        }
    });
}

function onPlayerGunshotInBush(player) {
    if (!player || player.dead) return;
    gameState.enemies.forEach(m => {
        if (m.dead || m.monsterType === 'dummy' || m.aiState === 'chasing') return;
        let d = Math.hypot(m.x - player.x, m.y - player.y);
        if (d <= MONSTER_VISION_RADIUS && Math.random() < 0.08) {
            m.aiState = 'alert';
            m.alertPhase = 1;
            m.alertTimer = 3.0;
            m.alertTargetPos = { x: player.x, y: player.y };
        }
    });
}
window.onPlayerGunshotInBush = onPlayerGunshotInBush;

function onPlayerAttackedInBush(player) {
    if (!player || player.dead) return;
    gameState.enemies.forEach(m => {
        if (m.dead || m.monsterType === 'dummy' || m.aiState === 'chasing') return;
        let d = Math.hypot(m.x - player.x, m.y - player.y);
        if (d <= MONSTER_VISION_RADIUS && Math.random() < 0.35) {
            m.aiState = 'chasing';
            m.currentTarget = player;
            m.lastKnownPos = { x: player.x, y: player.y };
        }
    });
}

// ==========================================================================
// 1. QUÁI ZOMBIE THƯỜNG (Mã: #z)
// ==========================================================================
class ZombieMonster extends SmartMonster {
    constructor(x, y, waveLevel = 1) {
        let randomHp = Math.floor(500 + Math.random() * 501) + (waveLevel - 1) * 40;
        super(x, y, 16, '#27ae60', {
            hp: randomHp,
            dame: 35 + (waveLevel - 1) * 3,
            speed: 170,
            armor: 15 + (waveLevel - 1) * 2,
            mr: 0,
            armorpen: 10
        });
        this.monsterType = 'zombie';
        this.monsterCode = '#z';
        this.atkCooldown = 0;
        this.isWindingUp = false;
        this.windupTimer = 0;
        this.recoverTimer = 0;
        this.currentTarget = null;
        this.attackLockedTarget = null;
    }

    update(dt) {
        if (this.dead) return;
        this.updateBurn(dt);
        if (this.stunTimer > 0) { this.stunTimer -= dt; return; }
        if (this.armorShredTimer > 0) {
            this.armorShredTimer -= dt;
            if (this.armorShredTimer <= 0) this.armorShredVal = 0;
        }
        if (this.slowTimer > 0) {
            this.slowTimer -= dt;
            if (this.slowTimer <= 0) this.slowAmount = 0;
        }

        this.updateCommonAI(dt);
        if (this.aiState !== 'chasing' || !this.currentTarget) return;

        let target = this.currentTarget;
        let dist = Math.hypot(target.x - this.x, target.y - this.y);
        let attackRange = this.radius + target.radius + 10;

        if (this.recoverTimer > 0) { this.recoverTimer -= dt; return; }

        if (this.isWindingUp) {
            this.windupTimer -= dt;
            if (this.windupTimer <= 0) {
                this.isWindingUp = false;
                let targetToHit = this.attackLockedTarget || this.currentTarget;
                if (targetToHit && !targetToHit.dead && !targetToHit.isResting) {
                    if (!(targetToHit.heroType === 'magadot' && targetToHit.isLevitating)) {
                        targetToHit.takeDamage(this.stats.ad, 'physical', this);
                        createImpactParticles(targetToHit.x, targetToHit.y, '#e74c3c', 6);
                        if (window.mapProps && window.mapProps.isEntityInBush(targetToHit)) {
                            onPlayerAttackedInBush(targetToHit);
                        }
                    }
                }
                this.attackLockedTarget = null;
                this.recoverTimer = 0.25;
                this.atkCooldown = 1.1;
            }
            return;
        }

        if (dist <= attackRange) {
            if (this.atkCooldown <= 0) {
                this.isWindingUp = true;
                this.windupTimer = 0.35;
                this.attackLockedTarget = target;
            }
        } else {
            let steerAngle = this.calculateSteering(target.x, target.y, dt);
            let curSpeed = this.getActualSpeed();
            this.x += Math.cos(steerAngle) * curSpeed;
            this.y += Math.sin(steerAngle) * curSpeed;
        }

        if (this.atkCooldown > 0) this.atkCooldown -= dt;
    }

    onDeath(killer) {
        super.onDeath(killer);
        if (killer && !killer.isMonster) { killer.gold += 20; killer.gainExp(15); }
        createImpactParticles(this.x, this.y, '#2ecc71', 10);
    }

    draw(ctx) {
        if (this.dead) return;
        ctx.save();
        let shakeX = this.isWindingUp ? (Math.random() - 0.5) * 3 : 0;
        let shakeY = this.isWindingUp ? (Math.random() - 0.5) * 3 : 0;

        ctx.beginPath();
        ctx.arc(this.x + shakeX, this.y + shakeY, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.isWindingUp ? '#e67e22' : this.color;
        ctx.fill();
        ctx.strokeStyle = this.slowTimer > 0 ? '#00d2d3' : (this.isWindingUp ? '#e74c3c' : '#1b2838');
        ctx.lineWidth = this.slowTimer > 0 ? 2.5 : 1.5;
        ctx.stroke();

        ctx.fillStyle = this.isWindingUp ? '#ffff00' : '#ff1744';
        ctx.beginPath();
        ctx.arc(this.x + shakeX - 4, this.y + shakeY - 3, 2.5, 0, Math.PI * 2);
        ctx.arc(this.x + shakeX + 4, this.y + shakeY - 3, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        this.drawHpBar(ctx);
    }
}

// ==========================================================================
// 2. QUÁI ZOMBIE HIỆP SĨ (Mã: #zk)
// ==========================================================================
class ZombieKnightMonster extends SmartMonster {
    constructor(x, y, waveLevel = 1) {
        let baseHp = Math.floor(650 + Math.random() * 400) + (waveLevel - 1) * 60;
        super(x, y, 17, '#1f8b4c', {
            hp: baseHp,
            dame: 50 + (waveLevel - 1) * 3,
            speed: 165,
            armor: 45 + (waveLevel - 1) * 2,
            mr: 30 + (waveLevel - 1) * 2,
            armorpen: 10
        });
        this.monsterType = 'knight';
        this.monsterCode = '#zk';
        this.atkCooldown = 0;
        this.isSlashing = false;
        this.slashProgress = 0;
        this.slashAngle = 0;
        this.currentTarget = null;
    }

    update(dt) {
        if (this.dead) return;
        this.updateBurn(dt);
        if (this.stunTimer > 0) { this.stunTimer -= dt; return; }
        if (this.armorShredTimer > 0) {
            this.armorShredTimer -= dt;
            if (this.armorShredTimer <= 0) this.armorShredVal = 0;
        }
        if (this.slowTimer > 0) {
            this.slowTimer -= dt;
            if (this.slowTimer <= 0) this.slowAmount = 0;
        }

        this.updateCommonAI(dt);
        if (this.aiState !== 'chasing' || !this.currentTarget) return;

        let target = this.currentTarget;
        let dist = Math.hypot(target.x - this.x, target.y - this.y);
        let attackRange = this.radius + target.radius + 18;

        if (this.isSlashing) {
            this.slashProgress += dt * 4.5;
            if (this.slashProgress >= 1.0) {
                this.isSlashing = false;
                if (target && !target.dead && !target.isResting && Math.hypot(target.x - this.x, target.y - this.y) <= attackRange + 15) {
                    if (!(target.heroType === 'magadot' && target.isLevitating)) {
                        target.takeDamage(this.stats.ad, 'physical', this);
                        createImpactParticles(target.x, target.y, '#e74c3c', 8);
                        if (window.mapProps && window.mapProps.isEntityInBush(target)) {
                            onPlayerAttackedInBush(target);
                        }
                    }
                }
                this.atkCooldown = 1.2;
            }
            return;
        }

        if (dist <= attackRange) {
            if (this.atkCooldown <= 0) {
                this.isSlashing = true;
                this.slashProgress = 0;
                this.slashAngle = Math.atan2(target.y - this.y, target.x - this.x);
            }
        } else {
            let steerAngle = this.calculateSteering(target.x, target.y, dt);
            let curSpeed = this.getActualSpeed();
            this.x += Math.cos(steerAngle) * curSpeed;
            this.y += Math.sin(steerAngle) * curSpeed;
        }

        if (this.atkCooldown > 0) this.atkCooldown -= dt;
    }

    onDeath(killer) {
        super.onDeath(killer);
        if (killer && !killer.isMonster) { killer.gold += 30; killer.gainExp(22); }
        createImpactParticles(this.x, this.y, '#1abc9c', 14);
    }

    draw(ctx) {
        if (this.dead) return;
        let aim = this.currentTarget ? Math.atan2(this.currentTarget.y - this.y, this.currentTarget.x - this.x) : 0;

        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        ctx.stroke();

        let ex = Math.cos(aim) * 4;
        let ey = Math.sin(aim) * 4;
        ctx.fillStyle = '#ff1744';
        ctx.beginPath();
        ctx.arc(this.x + ex - 3, this.y + ey - 2, 2.5, 0, Math.PI * 2);
        ctx.arc(this.x + ex + 3, this.y + ey - 2, 2.5, 0, Math.PI * 2);
        ctx.fill();

        let swordBaseAngle = this.isSlashing ? (this.slashAngle - Math.PI / 3 + this.slashProgress * (Math.PI * 0.75)) : (aim + 0.5);
        let swordLength = 24;
        let sx = this.x + Math.cos(swordBaseAngle) * (this.radius + 2);
        let sy = this.y + Math.sin(swordBaseAngle) * (this.radius + 2);
        let tipX = sx + Math.cos(swordBaseAngle) * swordLength;
        let tipY = sy + Math.sin(swordBaseAngle) * swordLength;

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tipX, tipY);
        ctx.strokeStyle = '#bdc3c7';
        ctx.lineWidth = 3.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#f39c12';
        ctx.fill();

        if (this.isSlashing) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + swordLength - 2, this.slashAngle - Math.PI / 3, this.slashAngle - Math.PI / 3 + this.slashProgress * (Math.PI * 0.75));
            ctx.strokeStyle = `rgba(236, 240, 241, ${1.0 - this.slashProgress * 0.7})`;
            ctx.lineWidth = 4;
            ctx.stroke();
        }
        ctx.restore();

        this.drawHpBar(ctx);
    }
}

// ==========================================================================
// 3. QUÁI PHÙ THỦY (Witch - Mã: #w)
// ==========================================================================
class WitchMonster extends SmartMonster {
    constructor(x, y, waveLevel = 1) {
        super(x, y, 15, '#8e44ad', {
            hp: 450 + (waveLevel - 1) * 35,
            dame: 0,
            speed: 230,
            armor: 12 + (waveLevel - 1) * 1.5,
            mr: 25 + (waveLevel - 1) * 2,
            armorpen: 0
        });
        this.monsterType = 'witch';
        this.monsterCode = '#w';
        this.hpBarColor = '#9b59b6';
        this.healCooldown = 4.0;
        this.fireballCooldown = 2.5;
        this.preferredRange = 320;
        this.currentTarget = null;
        this.aggroMonster = null;
    }

    takeDamage(amount, type, attacker = null, isCrit = false, source = 'skill') {
        let dmg = super.takeDamage(amount, type, attacker, isCrit, source);
        // Khi bị Crab cạp -> Phù thủy chuyển mục tiêu sang Crab
        if (!this.dead && attacker && attacker.isMonster && attacker.monsterType === 'crab') {
            this.aggroMonster = attacker;
        }
        return dmg;
    }

    update(dt) {
        if (this.dead) return;
        this.updateBurn(dt);
        if (this.stunTimer > 0) { this.stunTimer -= dt; return; }
        if (this.slowTimer > 0) {
            this.slowTimer -= dt;
            if (this.slowTimer <= 0) this.slowAmount = 0;
        }

        if (this.healCooldown > 0) this.healCooldown -= dt;
        if (this.fireballCooldown > 0) this.fireballCooldown -= dt;

        // Ưu tiên đánh trả Crab nếu đang bị cạp
        if (this.aggroMonster) {
            if (this.aggroMonster.dead) {
                this.aggroMonster = null;
            } else {
                this.resolveMonsterOverlap();
                let target = this.aggroMonster;
                let dist = Math.hypot(target.x - this.x, target.y - this.y);
                let ang = Math.atan2(target.y - this.y, target.x - this.x);
                let spd = this.getActualSpeed();

                if (dist > this.preferredRange + 30) {
                    this.x += Math.cos(ang) * spd;
                    this.y += Math.sin(ang) * spd;
                } else if (dist < this.preferredRange - 60) {
                    this.x -= Math.cos(ang) * spd * 0.5;
                    this.y -= Math.sin(ang) * spd * 0.5;
                }

                if (this.fireballCooldown <= 0 && dist <= 600) {
                    this.castFireballBarrage(ang, target);
                }
                return;
            }
        }

        this.updateCommonAI(dt);
        if (this.aiState !== 'chasing' || !this.currentTarget) return;

        let target = this.currentTarget;
        let dist = Math.hypot(target.x - this.x, target.y - this.y);
        let angleToPlayer = Math.atan2(target.y - this.y, target.x - this.x);

        let actualSpeed = this.getActualSpeed();
        if (dist > this.preferredRange + 30) {
            let steer = this.calculateSteering(target.x, target.y, dt);
            this.x += Math.cos(steer) * actualSpeed;
            this.y += Math.sin(steer) * actualSpeed;
        } else if (dist < this.preferredRange - 30) {
            let retreatSpeed = actualSpeed * 0.5;
            this.x -= Math.cos(angleToPlayer) * retreatSpeed;
            this.y -= Math.sin(angleToPlayer) * retreatSpeed;
        }

        if (this.healCooldown <= 0) this.castHealSkill();
        if (this.fireballCooldown <= 0 && dist <= 600) {
            this.castFireballBarrage(angleToPlayer, null);
        }
    }

    castHealSkill() {
        this.healCooldown = 10.0;
        let healRadius = 150;
        createShockwave(this.x, this.y, '#2ecc71', healRadius);

        gameState.enemies.forEach(mon => {
            if (!mon.dead && Math.hypot(mon.x - this.x, mon.y - this.y) <= healRadius) {
                let healAmt = mon.stats.maxHp * 0.15;
                mon.heal(healAmt);

                for (let i = 0; i < 5; i++) {
                    gameState.particles.push({
                        x: mon.x + (Math.random() - 0.5) * 16,
                        y: mon.y + (Math.random() - 0.5) * 16,
                        vx: 0, vy: -1.2,
                        size: 3,
                        color: '#2ecc71',
                        alpha: 0.9,
                        life: 0.4
                    });
                }
            }
        });
    }

    castFireballBarrage(targetAngle, monsterTarget = null) {
        this.fireballCooldown = 6.0;
        let count = 5;
        let delayStep = 110;

        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                if (this.dead) return;
                let dmg = Math.floor(50 + Math.random() * 51);

                gameState.projectiles.push(new MonsterProjectile({
                    owner: this,
                    x: this.x,
                    y: this.y,
                    vx: Math.cos(targetAngle),
                    vy: Math.sin(targetAngle),
                    radius: 7,
                    speed: 6.0,
                    damage: dmg,
                    dmgType: 'magic',
                    color: '#e67e22',
                    range: 650,
                    targetMonster: monsterTarget
                }));

                createImpactParticles(this.x, this.y, '#f39c12', 4);
            }, i * delayStep);
        }
    }

    onDeath(killer) {
        super.onDeath(killer);
        if (killer && !killer.isMonster) { killer.gold += 35; killer.gainExp(25); }
        createImpactParticles(this.x, this.y, '#9b59b6', 15);
    }

    draw(ctx) {
        if (this.dead) return;
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowColor = '#9b59b6';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.strokeStyle = '#e056fd';
        ctx.lineWidth = 2;
        ctx.stroke();

        let aimTarget = this.aggroMonster || this.currentTarget;
        let aim = aimTarget ? Math.atan2(aimTarget.y - this.y, aimTarget.x - this.x) : 0;
        let staffX = this.x + Math.cos(aim + 0.6) * 16;
        let staffY = this.y + Math.sin(aim + 0.6) * 16;
        ctx.beginPath();
        ctx.arc(staffX, staffY, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ff7675';
        ctx.shadowColor = '#e74c3c';
        ctx.shadowBlur = 10;
        ctx.fill();

        ctx.restore();
        this.drawHpBar(ctx);
    }
}

// ==========================================================================
// 4. QUÁI CRAB (Cua - Mã: c / #c)
// ==========================================================================
class CrabMonster extends SmartMonster {
    constructor(x, y, waveLevel = 1) {
        super(x, y, 15, '#e74c3c', {
            hp: 1000,
            dame: 22,
            speed: 175,
            armor: 550,
            mr: 200,
            armorpen: 0
        });
        this.monsterType = 'crab';
        this.monsterCode = '#c';
        this.atkCooldown = 0;
        this.isWindingUp = false;
        this.windupTimer = 0;
        this.stiffenTimer = 0; // Khựng lại sau khi cạp
        this.clawAnim = 0;
        this.currentTarget = null;
        this.aggroMonster = null;
        this.facingAngle = Math.random() * Math.PI * 2;
    }

    takeDamage(amount, type, attacker = null, isCrit = false, source = 'skill') {
        let dmg = super.takeDamage(amount, type, attacker, isCrit, source);
        // Nếu bị phù thủy bắn trúng -> nhắm mục tiêu vào phù thủy
        if (!this.dead && attacker && attacker.isMonster && attacker.monsterType === 'witch') {
            this.aggroMonster = attacker;
        }
        return dmg;
    }

    update(dt) {
        if (this.dead) return;
        this.updateBurn(dt);
        if (this.stunTimer > 0) { this.stunTimer -= dt; return; }
        if (this.armorShredTimer > 0) {
            this.armorShredTimer -= dt;
            if (this.armorShredTimer <= 0) this.armorShredVal = 0;
        }
        if (this.slowTimer > 0) {
            this.slowTimer -= dt;
            if (this.slowTimer <= 0) this.slowAmount = 0;
        }
        if (this.atkCooldown > 0) this.atkCooldown -= dt;

        // Khựng lại sau khi cạp hoặc đang dơ càng
        if (this.stiffenTimer > 0) {
            this.stiffenTimer -= dt;
            this.clawAnim = Math.max(0, this.clawAnim - dt * 3);
            return;
        }

        // Xác định mục tiêu (ưu tiên Phù Thủy nếu bị trúng đòn)
        let target = null;
        if (this.aggroMonster) {
            if (this.aggroMonster.dead) {
                this.aggroMonster = null;
            } else {
                this.resolveMonsterOverlap();
                target = this.aggroMonster;
            }
        }

        if (!target) {
            this.updateCommonAI(dt);
            if (this.aiState !== 'chasing' || !this.currentTarget) return;
            target = this.currentTarget;
        }

        this.facingAngle = Math.atan2(target.y - this.y, target.x - this.x);
        let dist = Math.hypot(target.x - this.x, target.y - this.y);
        let attackRange = this.radius + target.radius + 10;

        if (this.isWindingUp) {
            this.windupTimer -= dt;
            this.clawAnim = Math.min(1, this.clawAnim + dt * 4);
            if (this.windupTimer <= 0) {
                this.isWindingUp = false;
                if (target && !target.dead && (!target.isResting) && Math.hypot(target.x - this.x, target.y - this.y) <= attackRange + 14) {
                    if (!(target.heroType === 'magadot' && target.isLevitating)) {
                        target.takeDamage(this.stats.ad, 'physical', this);
                        createImpactParticles(target.x, target.y, '#ff6b6b', 5);
                        if (!target.isMonster && window.mapProps && window.mapProps.isEntityInBush(target)) {
                            onPlayerAttackedInBush(target);
                        }
                    }
                }
                this.atkCooldown = 2.0; // Tốc đánh 2s
                this.stiffenTimer = 0.35; // Bị khựng khi cạp
            }
            return;
        }

        if (dist <= attackRange) {
            if (this.atkCooldown <= 0) {
                this.isWindingUp = true;
                this.windupTimer = 0.35; // Dơ càng bé lên chuẩn bị cạp (đứng khựng)
                this.clawAnim = 0.2;
            }
        } else {
            let steerAngle = this.calculateSteering(target.x, target.y, dt);
            let curSpeed = this.getActualSpeed();
            this.x += Math.cos(steerAngle) * curSpeed;
            this.y += Math.sin(steerAngle) * curSpeed;
        }
    }

    onDeath(killer) {
        super.onDeath(killer);
        if (killer && !killer.isMonster) { killer.gold += 22; killer.gainExp(18); }
        createImpactParticles(this.x, this.y, '#e74c3c', 10);
    }

    draw(ctx) {
        if (this.dead) return;
        let angle = this.facingAngle || 0;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);

        // Chân cua
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 2;
        for (let side of [-1, 1]) {
            for (let i = -1; i <= 1; i++) {
                ctx.beginPath();
                ctx.moveTo(i * 4, side * 10);
                ctx.lineTo(i * 6 - 2, side * 17);
                ctx.stroke();
            }
        }

        // Càng TO (bên trái thân)
        ctx.fillStyle = '#d63031';
        ctx.strokeStyle = '#6d1b1b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(11, -13, 9, 6, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Càng BÉ (bên phải thân) - dơ lên/vươn ra phía trước khi tấn công
        let liftOffset = (this.isWindingUp || this.stiffenTimer > 0) ? 7 * (0.4 + this.clawAnim * 0.6) : 0;
        ctx.save();
        ctx.translate(10 + liftOffset, 10 - liftOffset * 0.3);
        ctx.rotate(-liftOffset * 0.06);
        ctx.fillStyle = '#ff7675';
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 3.2, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Mai cua
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius - 1, this.radius + 1, 0, 0, Math.PI * 2);
        ctx.fillStyle = this.isWindingUp ? '#ff7979' : this.color;
        ctx.fill();
        ctx.strokeStyle = '#781f1f';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Mắt cua
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(7, -4, 2.5, 0, Math.PI * 2);
        ctx.arc(7, 4, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(8, -4, 1.2, 0, Math.PI * 2);
        ctx.arc(8, 4, 1.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        this.drawHpBar(ctx);
    }
}

// ==========================================================================
// 5. QUÁI KING CRAB (Vua Cua - Mã: #kc)
// ==========================================================================
class KingCrabMonster extends SmartMonster {
    constructor(x, y, waveLevel = 1) {
        super(x, y, 28, '#b33939', {
            hp: 5000,
            hpRegen: 5.0, // Hồi 5 HP/s
            dame: 0,
            speed: 150,
            armor: 1000,
            mr: 500,
            armorpen: 0
        });
        this.monsterType = 'kingcrab';
        this.monsterCode = '#kc';
        this.waveLevel = waveLevel;
        this.preferredDist = 280;
        this.summonCooldown = 5.0; // Lần đầu dùng sớm, sau đó mỗi 20s
        this.pendingSummons = [];
        this.localDecision = 'stand'; // 'stand' hoặc 'random_walk'
        this.localTimer = 1.5;
        this.randomWalkTarget = null;
        this.facingAngle = 0;

        if (typeof getAnimFrames === 'function') {
            getAnimFrames('Magic/Summon', 16);
        }
    }

    update(dt) {
        if (this.dead) return;
        this.updateBurn(dt);
        this.stats.update(dt); // Hồi 5hp/s

        if (this.stunTimer > 0) { this.stunTimer -= dt; return; }
        if (this.armorShredTimer > 0) {
            this.armorShredTimer -= dt;
            if (this.armorShredTimer <= 0) this.armorShredVal = 0;
        }
        if (this.slowTimer > 0) {
            this.slowTimer -= dt;
            if (this.slowTimer <= 0) this.slowAmount = 0;
        }

        // Cập nhật tiến trình triệu hồi 5 Crab
        for (let i = this.pendingSummons.length - 1; i >= 0; i--) {
            let s = this.pendingSummons[i];
            s.delay -= dt;
            if (s.delay <= 0) {
                this.pendingSummons.splice(i, 1);
                this.triggerSingleStarSummon(s.x, s.y);
            }
        }

        if (this.summonCooldown > 0) this.summonCooldown -= dt;

        this.resolveMonsterOverlap();

        // Tìm người chơi gần nhất trong tầm nhìn
        let visiblePlayers = gameState.players.filter(p => isPlayerVisibleToMonster(this, p));
        if (visiblePlayers.length === 0) {
            this.updateCommonAI(dt);
            return;
        }

        let target = visiblePlayers.reduce((prev, curr) =>
            Math.hypot(curr.x - this.x, curr.y - this.y) < Math.hypot(prev.x - this.x, prev.y - this.y) ? curr : prev
        );
        this.currentTarget = target;
        this.lastKnownPos = { x: target.x, y: target.y };
        this.aiState = 'chasing';
        this.facingAngle = Math.atan2(target.y - this.y, target.x - this.x);

        let dist = Math.hypot(target.x - this.x, target.y - this.y);

        // Chiêu triệu hồi 5 Crab thành hình cánh sao mỗi 20s
        if (this.summonCooldown <= 0) {
            this.castStarSummonSkill();
        }

        // Cơ chế di chuyển: giữ khoảng cách, nếu người chơi đến gần KHÔNG lùi lại mà đứng yên hoặc đi random
        if (dist > this.preferredDist) {
            let ang = this.calculateSteering(target.x, target.y, dt);
            let spd = this.getActualSpeed();
            this.x += Math.cos(ang) * spd;
            this.y += Math.sin(ang) * spd;
        } else {
            this.localTimer -= dt;
            if (this.localTimer <= 0) {
                if (Math.random() < 0.5) {
                    this.localDecision = 'stand';
                    this.localTimer = 1.5 + Math.random() * 2.0;
                    this.randomWalkTarget = null;
                } else {
                    this.localDecision = 'random_walk';
                    this.localTimer = 1.5 + Math.random() * 1.8;
                    let rAng = Math.random() * Math.PI * 2;
                    let rDist = 70 + Math.random() * 100;
                    this.randomWalkTarget = {
                        x: Math.max(80, Math.min(WORLD_WIDTH - 80, this.x + Math.cos(rAng) * rDist)),
                        y: Math.max(80, Math.min(WORLD_HEIGHT - 80, this.y + Math.sin(rAng) * rDist))
                    };
                }
            }

            if (this.localDecision === 'random_walk' && this.randomWalkTarget) {
                let dWalk = Math.hypot(this.randomWalkTarget.x - this.x, this.randomWalkTarget.y - this.y);
                if (dWalk > 12) {
                    let ang = this.calculateSteering(this.randomWalkTarget.x, this.randomWalkTarget.y, dt);
                    let spd = this.getActualSpeed() * 0.7;
                    this.x += Math.cos(ang) * spd;
                    this.y += Math.sin(ang) * spd;
                }
            }
        }
    }

    castStarSummonSkill() {
        this.summonCooldown = 20.0;
        let baseAngle = Math.random() * Math.PI * 2;
        let starRadius = 95;
        let cumulativeDelay = 0;

        for (let i = 0; i < 5; i++) {
            let ang = baseAngle + i * ((Math.PI * 2) / 5);
            let sx = Math.max(60, Math.min(WORLD_WIDTH - 60, this.x + Math.cos(ang) * starRadius));
            let sy = Math.max(60, Math.min(WORLD_HEIGHT - 60, this.y + Math.sin(ang) * starRadius));
            if (i > 0) cumulativeDelay += 0.1 + Math.random() * 0.4; // Cách nhau 0.1 - 0.5s
            this.pendingSummons.push({ x: sx, y: sy, delay: cumulativeDelay });
        }
    }

    triggerSingleStarSummon(sx, sy) {
        if (this.dead) return;
        let spawned = false;
        const doSpawn = () => {
            if (spawned) return;
            spawned = true;
            let crab = new CrabMonster(sx, sy, this.waveLevel);
            gameState.enemies.push(crab);
        };

        if (typeof spawnAnimatedEffect === 'function') {
            spawnAnimatedEffect('Magic/Summon', sx, sy, {
                scale: 1.5,
                fps: 18,
                rotation: 0,
                onFrame: (frameNum) => {
                    // Quái xuất hiện ở frame thứ 5 (và luôn nằm dưới layer của hiệu ứng)
                    if (frameNum >= 5) doSpawn();
                }
            });
            // Fallback an toàn nếu frame ảnh chưa tải kịp
            setTimeout(() => { if (!spawned && gameState.active) doSpawn(); }, 350);
        } else {
            doSpawn();
        }
    }

    onDeath(killer) {
        super.onDeath(killer);
        this.pendingSummons = [];
        if (killer && !killer.isMonster) { killer.gold += 85; killer.gainExp(65); }
        createImpactParticles(this.x, this.y, '#ff5252', 18);
    }

    draw(ctx) {
        if (this.dead) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.facingAngle);

        // Chân vua cua
        ctx.strokeStyle = '#842020';
        ctx.lineWidth = 3.5;
        for (let side of [-1, 1]) {
            for (let i = -1; i <= 1; i++) {
                ctx.beginPath();
                ctx.moveTo(i * 8, side * 18);
                ctx.lineTo(i * 11 - 4, side * 32);
                ctx.stroke();
            }
        }

        // 2 Càng lớn uy nghiêm
        ctx.fillStyle = '#c0392b';
        ctx.strokeStyle = '#ffd32a';
        ctx.lineWidth = 2;
        for (let side of [-1, 1]) {
            ctx.beginPath();
            ctx.ellipse(20, side * 22, 13, 8, side * 0.35, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        // Mai Vua Cua
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius, this.radius + 3, 0, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Vương miện vàng trên mai
        ctx.fillStyle = '#ffd32a';
        ctx.beginPath();
        ctx.moveTo(-6, -8);
        ctx.lineTo(-2, -3);
        ctx.lineTo(4, -9);
        ctx.lineTo(4, 9);
        ctx.lineTo(-2, 3);
        ctx.lineTo(-6, 8);
        ctx.closePath();
        ctx.fill();

        // Mắt phát sáng
        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath();
        ctx.arc(14, -7, 3.5, 0, Math.PI * 2);
        ctx.arc(14, 7, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        this.drawHpBar(ctx);
    }
}

// ==========================================================================
// 6. QUÁI MANTIS (Bọ Ngựa - Mã: #m)
// ==========================================================================
class MantisMonster extends SmartMonster {
    constructor(x, y, waveLevel = 1) {
        super(x, y, 18, '#7bed9f', {
            hp: 1200,
            dame: 50,
            speed: 115, // Tốc chạy chậm
            armor: 70,
            mr: 70,
            armorpen: 0
        });
        this.monsterType = 'mantis';
        this.monsterCode = '#m';
        this.atkCooldown = 0;
        this.skillCooldown = 0;

        // Trạng thái: 'normal', 'telegraph', 'dashing', 'resting'
        this.mantisState = 'normal';
        this.telegraphTimer = 0;
        this.dashAngle = 0;
        this.dashLength = 340;
        this.dashWidth = 44;
        this.dashTraveled = 0;
        this.dashSpeed = 950;
        this.dashHitPlayers = new Set();
        this.restTimer = 0;
        this.facingAngle = 0;
    }

    update(dt) {
        if (this.dead) return;
        this.updateBurn(dt);
        if (this.stunTimer > 0) { this.stunTimer -= dt; return; }
        if (this.armorShredTimer > 0) {
            this.armorShredTimer -= dt;
            if (this.armorShredTimer <= 0) this.armorShredVal = 0;
        }
        if (this.slowTimer > 0) {
            this.slowTimer -= dt;
            if (this.slowTimer <= 0) this.slowAmount = 0;
        }
        if (this.atkCooldown > 0) this.atkCooldown -= dt;

        // 1. Đang tạo vùng báo hiệu dài (1s)
        if (this.mantisState === 'telegraph') {
            this.telegraphTimer -= dt;
            if (this.telegraphTimer <= 0) {
                this.mantisState = 'dashing';
                this.dashTraveled = 0;
                this.dashHitPlayers.clear();
            }
            return;
        }

        // 2. Lao thẳng theo đường báo hiệu gây 200 dame
        if (this.mantisState === 'dashing') {
            let step = this.dashSpeed * dt;
            this.x += Math.cos(this.dashAngle) * step;
            this.y += Math.sin(this.dashAngle) * step;
            this.x = Math.max(30, Math.min(WORLD_WIDTH - 30, this.x));
            this.y = Math.max(30, Math.min(WORLD_HEIGHT - 30, this.y));
            this.dashTraveled += step;

            for (let p of gameState.players) {
                if (!p || p.dead || p.isResting || this.dashHitPlayers.has(p)) continue;
                if (p.heroType === 'magadot' && p.isLevitating) continue;
                if (Math.hypot(p.x - this.x, p.y - this.y) <= this.radius + p.radius + 10) {
                    this.dashHitPlayers.add(p);
                    p.takeDamage(200, 'physical', this);
                    createImpactParticles(p.x, p.y, '#2ed573', 10);
                }
            }

            if (this.dashTraveled >= this.dashLength) {
                this.mantisState = 'resting';
                this.restTimer = 7.0; // Nghỉ 7s
            }
            return;
        }

        // 3. Nghỉ 7s sau khi lao, rồi mới hồi chiêu 10s
        if (this.mantisState === 'resting') {
            this.restTimer -= dt;
            if (this.restTimer <= 0) {
                this.mantisState = 'normal';
                this.skillCooldown = 10.0; // Hồi chiêu 10s SAU KHI NGHỈ
            }
            return;
        }

        if (this.skillCooldown > 0) this.skillCooldown -= dt;

        this.updateCommonAI(dt);
        if (this.aiState !== 'chasing' || !this.currentTarget) return;

        let target = this.currentTarget;
        this.facingAngle = Math.atan2(target.y - this.y, target.x - this.x);
        let dist = Math.hypot(target.x - this.x, target.y - this.y);

        // Tới gần người chơi -> tạo vùng báo hiệu dài
        if (this.skillCooldown <= 0 && dist <= 260) {
            this.mantisState = 'telegraph';
            this.telegraphTimer = 1.0;
            this.dashAngle = this.facingAngle;
            return;
        }

        let attackRange = this.radius + target.radius + 14;
        if (dist <= attackRange) {
            if (this.atkCooldown <= 0) {
                this.atkCooldown = 1.3;
                if (!target.dead && !target.isResting && !(target.heroType === 'magadot' && target.isLevitating)) {
                    target.takeDamage(this.stats.ad, 'physical', this);
                    createImpactParticles(target.x, target.y, '#7bed9f', 6);
                }
            }
        } else {
            let steerAngle = this.calculateSteering(target.x, target.y, dt);
            let spd = this.getActualSpeed();
            this.x += Math.cos(steerAngle) * spd;
            this.y += Math.sin(steerAngle) * spd;
        }
    }

    onDeath(killer) {
        super.onDeath(killer);
        if (killer && !killer.isMonster) { killer.gold += 40; killer.gainExp(28); }
        createImpactParticles(this.x, this.y, '#7bed9f', 12);
    }

    draw(ctx) {
        if (this.dead) return;

        // Vẽ vùng báo hiệu lao thẳng
        if (this.mantisState === 'telegraph') {
            let progress = Math.max(0, Math.min(1, 1 - this.telegraphTimer / 1.0));
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.dashAngle);

            ctx.fillStyle = "rgba(255, 71, 87, 0.22)";
            ctx.fillRect(0, -this.dashWidth / 2, this.dashLength, this.dashWidth);

            ctx.fillStyle = "rgba(255, 71, 87, 0.45)";
            ctx.fillRect(0, -this.dashWidth / 2, this.dashLength * progress, this.dashWidth);

            ctx.strokeStyle = "#ff4757";
            ctx.lineWidth = 2;
            ctx.strokeRect(0, -this.dashWidth / 2, this.dashLength, this.dashWidth);
            ctx.restore();
        }

        let drawAngle = (this.mantisState === 'telegraph' || this.mantisState === 'dashing') ? this.dashAngle : this.facingAngle;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(drawAngle);

        // 1 lưỡi chém bọ ngựa sắc bén
        ctx.beginPath();
        ctx.moveTo(8, 6);
        ctx.quadraticCurveTo(32, 18, 28, -4);
        ctx.quadraticCurveTo(22, 10, 8, 2);
        ctx.closePath();
        ctx.fillStyle = '#dff9fb';
        ctx.strokeStyle = '#2ed573';
        ctx.lineWidth = 1.5;
        ctx.fill();
        ctx.stroke();

        // Thân bọ ngựa
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius, this.radius - 4, 0, 0, Math.PI * 2);
        ctx.fillStyle = this.mantisState === 'resting' ? '#576574' : this.color;
        ctx.fill();
        ctx.strokeStyle = '#1e8449';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Mắt bọ ngựa
        ctx.fillStyle = '#ff4757';
        ctx.beginPath();
        ctx.arc(10, -5, 2.5, 0, Math.PI * 2);
        ctx.arc(10, 5, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        if (this.mantisState === 'resting') {
            ctx.save();
            ctx.font = "bold 12px Arial";
            ctx.fillStyle = "#a4b0be";
            ctx.textAlign = "center";
            ctx.fillText(`💤 ${Math.ceil(this.restTimer)}s`, this.x, this.y - this.radius - 16);
            ctx.restore();
        }

        this.drawHpBar(ctx);
    }
}

// ==========================================================================
// 7. QUÁI ARK GOLEM (Mã: #ag - Không spawn tự nhiên)
// ==========================================================================
class ArkGolemMonster extends SmartMonster {
    constructor(x, y, waveLevel = 1) {
        super(x, y, 24, '#636e72', {
            hp: 2000,
            dame: 75,
            speed: 145,
            armor: 700,
            mr: 700,
            armorpen: 0
        });
        this.monsterType = 'arkgolem';
        this.monsterCode = '#ag';
        this.atkCooldown = 0;
        this.isPunching = false;
        this.punchTimer = 0;
        this.facingAngle = 0;
    }

    update(dt) {
        if (this.dead) return;
        this.updateBurn(dt);
        if (this.stunTimer > 0) { this.stunTimer -= dt; return; }
        if (this.armorShredTimer > 0) {
            this.armorShredTimer -= dt;
            if (this.armorShredTimer <= 0) this.armorShredVal = 0;
        }
        if (this.slowTimer > 0) {
            this.slowTimer -= dt;
            if (this.slowTimer <= 0) this.slowAmount = 0;
        }
        if (this.atkCooldown > 0) this.atkCooldown -= dt;

        this.updateCommonAI(dt);
        if (this.aiState !== 'chasing' || !this.currentTarget) return;

        let target = this.currentTarget;
        this.facingAngle = Math.atan2(target.y - this.y, target.x - this.x);
        let dist = Math.hypot(target.x - this.x, target.y - this.y);
        let attackRange = this.radius + target.radius + 14;

        if (this.isPunching) {
            this.punchTimer -= dt;
            if (this.punchTimer <= 0) {
                this.isPunching = false;
                if (target && !target.dead && !target.isResting && Math.hypot(target.x - this.x, target.y - this.y) <= attackRange + 15) {
                    if (!(target.heroType === 'magadot' && target.isLevitating)) {
                        target.takeDamage(this.stats.ad, 'physical', this);
                        createImpactParticles(target.x, target.y, '#b2bec3', 8);
                    }
                }
                this.atkCooldown = 1.4;
            }
            return;
        }

        if (dist <= attackRange) {
            if (this.atkCooldown <= 0) {
                this.isPunching = true;
                this.punchTimer = 0.35;
            }
        } else {
            let steerAngle = this.calculateSteering(target.x, target.y, dt);
            let spd = this.getActualSpeed();
            this.x += Math.cos(steerAngle) * spd;
            this.y += Math.sin(steerAngle) * spd;
        }
    }

    onDeath(killer) {
        super.onDeath(killer);
        if (killer && !killer.isMonster) { killer.gold += 55; killer.gainExp(40); }
        createImpactParticles(this.x, this.y, '#636e72', 14);
    }

    draw(ctx) {
        if (this.dead) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.facingAngle);

        let punchPush = this.isPunching ? 9 : 0;

        // 2 tay cơ bắp chuẩn bị đấm
        ctx.fillStyle = '#4a5459';
        ctx.strokeStyle = '#2d3436';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(10 + punchPush, -24, 16, 12, 4) : ctx.rect(10 + punchPush, -24, 16, 12);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(10 + punchPush, 12, 16, 12, 4) : ctx.rect(10 + punchPush, 12, 16, 12);
        ctx.fill();
        ctx.stroke();

        // Thân đá golem
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#2d3436';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Lõi sáng
        ctx.fillStyle = '#00cec9';
        ctx.beginPath();
        ctx.arc(8, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        this.drawHpBar(ctx);
    }
}

// ==========================================================================
// 8. BOSS ANCIENT GOLEM (Mã: #bag)
// ==========================================================================
class AncientGolemBoss extends SmartMonster {
    constructor(x, y, waveLevel = 1) {
        super(x, y, 52, '#57606f', {
            hp: 10000,
            dame: 200,
            speed: 105, // Tốc độ chậm
            armor: 1000,
            mr: 1000,
            armorpen: 0
        });
        this.monsterType = 'ancientgolem';
        this.monsterCode = '#bag';
        this.monsterName = 'ANCIENT GOLEM';
        this.isBoss = true;
        this.waveLevel = waveLevel;
        this.hpBarColor = '#95a5a6'; // Màu HP xám

        this.atkCooldown = 0;
        this.isPunching = false;
        this.punchTimer = 0;
        this.facingAngle = 0;

        // Di chuyển ưu tiên tiếp cận đánh thường hơn nghỉ/random
        this.roamTimer = 0;
        this.roamMode = 'chase';
        this.roamPoint = null;

        // Kỹ năng
        this.skill1Cooldown = 5.0;  // 15s sau mỗi lần dùng
        this.skill2Cooldown = 7.0;  // 10s
        this.skill3Cooldown = 10.0; // 15s

        // Trạng thái Chiêu 1 (6 đợt xoắn ốc)
        this.s1WavesLeft = 0;
        this.s1WaveTimer = 0;
        this.s1SpiralAngle = 0;

        if (typeof getAnimFrames === 'function') {
            getAnimFrames('Projectiles/Homing Orb', 16);
            getAnimFrames('Explosions/Sci-Fi Blast', 6);
            getAnimFrames('Magic/Shield Bubble', 16);
            getAnimFrames('Magic/Summon', 16);
        }
    }

    update(dt) {
        if (this.dead) return;
        this.updateBurn(dt);
        if (this.stunTimer > 0) { this.stunTimer -= dt; return; }
        if (this.armorShredTimer > 0) {
            this.armorShredTimer -= dt;
            if (this.armorShredTimer <= 0) this.armorShredVal = 0;
        }
        if (this.slowTimer > 0) {
            this.slowTimer -= dt;
            if (this.slowTimer <= 0) this.slowAmount = 0;
        }

        if (this.atkCooldown > 0) this.atkCooldown -= dt;
        if (this.skill1Cooldown > 0) this.skill1Cooldown -= dt;
        if (this.skill2Cooldown > 0) this.skill2Cooldown -= dt;
        if (this.skill3Cooldown > 0) this.skill3Cooldown -= dt;

        // Bắn liên tiếp 6 đợt cầu xoắn ốc (cách nhau 0.75s)
        if (this.s1WavesLeft > 0) {
            this.s1WaveTimer -= dt;
            if (this.s1WaveTimer <= 0) {
                this.s1WavesLeft--;
                this.s1WaveTimer = 0.75;
                this.fireSpiralOrbWave();
            }
        }

        this.resolveMonsterOverlap();

        // Tìm người chơi
        let alivePlayers = gameState.players.filter(p => p && !p.dead && !p.isResting);
        if (alivePlayers.length === 0) return;

        let target = alivePlayers.reduce((prev, curr) =>
            Math.hypot(curr.x - this.x, curr.y - this.y) < Math.hypot(prev.x - this.x, prev.y - this.y) ? curr : prev
        );
        this.currentTarget = target;
        this.facingAngle = Math.atan2(target.y - this.y, target.x - this.x);

        // Kích hoạt kỹ năng
        if (this.skill1Cooldown <= 0 && this.s1WavesLeft <= 0) {
            this.skill1Cooldown = 15.0;
            this.s1WavesLeft = 6;
            this.s1WaveTimer = 0;
            this.s1SpiralAngle = this.facingAngle;
        }
        if (this.skill2Cooldown <= 0) {
            this.castSkill2Shield();
        }
        if (this.skill3Cooldown <= 0) {
            this.castSkill3SummonArkGolem();
        }

        let dist = Math.hypot(target.x - this.x, target.y - this.y);
        let attackRange = this.radius + target.radius + 26;

        // Đánh thường (ưu tiên hàng đầu)
        if (this.isPunching) {
            this.punchTimer -= dt;
            if (this.punchTimer <= 0) {
                this.isPunching = false;
                if (!target.dead && !target.isResting && Math.hypot(target.x - this.x, target.y - this.y) <= attackRange + 20) {
                    if (!(target.heroType === 'magadot' && target.isLevitating)) {
                        target.takeDamage(this.stats.ad, 'physical', this);
                        createImpactParticles(target.x, target.y, '#95a5a6', 14);
                        createShockwave(target.x, target.y, '#7f8c8d', 65);
                    }
                }
                this.atkCooldown = 1.8;
                // Sau khi đấm: tỉ lệ nhỏ (20%) đi random nhẹ hoặc đứng nghỉ ngắn thay vì lùi, 80% vẫn áp sát
                if (Math.random() < 0.20) {
                    this.roamTimer = 1.0;
                    this.roamMode = Math.random() < 0.5 ? 'stand' : 'random';
                    let rAng = Math.random() * Math.PI * 2;
                    this.roamPoint = {
                        x: Math.max(80, Math.min(WORLD_WIDTH - 80, this.x + Math.cos(rAng) * 80)),
                        y: Math.max(80, Math.min(WORLD_HEIGHT - 80, this.y + Math.sin(rAng) * 80))
                    };
                }
            }
            return;
        }

        if (dist <= attackRange) {
            if (this.atkCooldown <= 0) {
                this.isPunching = true;
                this.punchTimer = 0.45;
            }
        } else {
            if (this.roamTimer > 0) {
                this.roamTimer -= dt;
                if (this.roamMode === 'random' && this.roamPoint) {
                    let ang = this.calculateSteering(this.roamPoint.x, this.roamPoint.y, dt);
                    let spd = this.getActualSpeed() * 0.6;
                    this.x += Math.cos(ang) * spd;
                    this.y += Math.sin(ang) * spd;
                }
                if (this.roamTimer <= 0) this.roamMode = 'chase';
            } else {
                // Luôn ưu tiên tiếp cận người chơi
                let steerAngle = this.calculateSteering(target.x, target.y, dt);
                let spd = this.getActualSpeed();
                this.x += Math.cos(steerAngle) * spd;
                this.y += Math.sin(steerAngle) * spd;
            }
        }
    }

    fireSpiralOrbWave() {
        let totalPlayersMaxHp = gameState.players.reduce((sum, p) => sum + (p ? p.stats.maxHp : 0), 0);
        let orbDmg = 100 + totalPlayersMaxHp * 0.05;
        let orbCount = 10;

        for (let i = 0; i < orbCount; i++) {
            let angle = this.s1SpiralAngle + i * ((Math.PI * 2) / orbCount);
            gameState.projectiles.push(new MonsterProjectile({
                owner: this,
                x: this.x + Math.cos(angle) * (this.radius * 0.6),
                y: this.y + Math.sin(angle) * (this.radius * 0.6),
                vx: Math.cos(angle),
                vy: Math.sin(angle),
                radius: 10,
                speed: 3.0, // Bay chậm
                damage: orbDmg,
                dmgType: 'true', // Sát thương chuẩn
                color: '#00cec9',
                range: 950,
                spriteFolder: 'Projectiles/Homing Orb',
                spriteScale: 1.4,
                spriteFps: 18,
                hitEffect: 'Explosions/Sci-Fi Blast',
                hitEffectScale: 1.5
            }));
        }
        this.s1SpiralAngle += 0.28; // Tạo xoắn ốc qua 6 đợt
    }

    castSkill2Shield() {
        this.skill2Cooldown = 10.0;
        let minutes = Math.floor((window.matchTimer || 0) / 60);
        let shieldAmount = Math.min(1000, 100 + minutes * 50);
        let radius = 420;

        createShockwave(this.x, this.y, '#74b9ff', radius);

        gameState.enemies.forEach(mon => {
            if (mon.dead || mon.monsterType === 'dummy' || mon === this) return;
            if (Math.hypot(mon.x - this.x, mon.y - this.y) <= radius) {
                mon.shield = Math.max(mon.shield || 0, shieldAmount);
                if (!mon.shieldFx || mon.shieldFx.dead) {
                    if (typeof spawnAnimatedEffect === 'function') {
                        mon.shieldFx = spawnAnimatedEffect('Magic/Shield Bubble', mon.x, mon.y, {
                            targetSize: mon.radius * 2.7,
                            fps: 18,
                            loop: true,
                            rotation: 0,
                            followTarget: mon
                        });
                    }
                }
            }
        });
    }

    castSkill3SummonArkGolem() {
        this.skill3Cooldown = 15.0;
        let ang = Math.random() * Math.PI * 2;
        let sx = Math.max(80, Math.min(WORLD_WIDTH - 80, this.x + Math.cos(ang) * 95));
        let sy = Math.max(80, Math.min(WORLD_HEIGHT - 80, this.y + Math.sin(ang) * 95));

        let spawned = false;
        const doSpawn = () => {
            if (spawned) return;
            spawned = true;
            let ag = new ArkGolemMonster(sx, sy, this.waveLevel);
            gameState.enemies.push(ag);
        };

        if (typeof spawnAnimatedEffect === 'function') {
            spawnAnimatedEffect('Magic/Summon', sx, sy, {
                scale: 1.8,
                fps: 18,
                rotation: 0,
                onFrame: (f) => {
                    if (f >= 5) doSpawn();
                }
            });
            setTimeout(() => { if (!spawned && gameState.active) doSpawn(); }, 350);
        } else {
            doSpawn();
        }
    }

    onDeath(killer) {
        super.onDeath(killer);
        // Chờ 1 phút sau sẽ spawn con boss mới
        if (typeof gameState !== 'undefined') {
            gameState.firstBossSpawned = true;
            gameState.bossRespawnTimer = 60.0;
        }
        if (killer && !killer.isMonster) {
            killer.gold += 350;
            killer.gainExp(250);
        }
        createImpactParticles(this.x, this.y, '#95a5a6', 30);
    }

    draw(ctx) {
        if (this.dead) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.facingAngle);

        let punchPush = this.isPunching ? 16 : 0;

        // 2 tay đá khổng lồ cơ bắp
        ctx.fillStyle = '#485460';
        ctx.strokeStyle = '#1e272e';
        ctx.lineWidth = 3;
        ctx.fillRect(20 + punchPush, -50, 32, 24);
        ctx.strokeRect(20 + punchPush, -50, 32, 24);
        ctx.fillRect(20 + punchPush, 26, 32, 24);
        ctx.strokeRect(20 + punchPush, 26, 32, 24);

        // Thân Ancient Golem to lớn
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#2f3640';
        ctx.lineWidth = 5;
        ctx.stroke();

        // Các mảng rêu xanh bám quanh người
        ctx.fillStyle = '#2ecc71';
        const mossSpots = [
            { x: -24, y: -22, r: 12 },
            { x: -28, y: 18, r: 14 },
            { x: 5, y: -34, r: 11 },
            { x: 10, y: 32, r: 10 },
            { x: -10, y: 2, r: 9 }
        ];
        mossSpots.forEach(m => {
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
            ctx.fill();
        });

        // Con mắt cổ đại phát sáng mạnh
        ctx.save();
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#00f2fe';
        ctx.beginPath();
        ctx.arc(20, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(22, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.restore();
        this.drawHpBar(ctx);
    }
}

// ==========================================================================
// 9. ĐẠN QUÁI VẬT (Hỗ trợ sprite hiệu ứng & va chạm Crab)
// ==========================================================================
class MonsterProjectile {
    constructor(cfg) {
        this.owner = cfg.owner;
        this.x = cfg.x;
        this.y = cfg.y;
        this.vx = cfg.vx;
        this.vy = cfg.vy;
        this.radius = cfg.radius || 6;
        this.speed = cfg.speed || 5;
        this.damage = cfg.damage || 50;
        this.dmgType = cfg.dmgType || 'magic';
        this.color = cfg.color || '#e67e22';
        this.range = cfg.range || 600;
        this.targetMonster = cfg.targetMonster || null;

        this.spriteFolder = cfg.spriteFolder || null;
        this.spriteScale = cfg.spriteScale || 1.0;
        this.spriteFps = cfg.spriteFps || 18;
        this.hitEffect = cfg.hitEffect || null;
        this.hitEffectScale = cfg.hitEffectScale || 1.2;

        this.animTime = 0;
        this.dist = 0;
        this.dead = false;
        this.checkedCrabs = new Set();

        if (this.spriteFolder && typeof getAnimFrames === 'function') getAnimFrames(this.spriteFolder, 16);
        if (this.hitEffect && typeof getAnimFrames === 'function') getAnimFrames(this.hitEffect, 10);
    }

    spawnHitExplosion(x, y) {
        if (this.hitEffect && typeof spawnAnimatedEffect === 'function') {
            spawnAnimatedEffect(this.hitEffect, x, y, {
                scale: this.hitEffectScale,
                fps: 20,
                loop: false,
                rotation: 0
            });
        } else {
            createImpactParticles(x, y, '#e74c3c', 8);
        }
    }

    update(dt) {
        this.animTime += dt;
        let dx = this.vx * this.speed * dt * 60;
        let dy = this.vy * this.speed * dt * 60;
        this.x += dx;
        this.y += dy;
        this.dist += Math.hypot(dx, dy);

        if (this.dist >= this.range) {
            this.dead = true;
            return;
        }

        if (!this.spriteFolder && Math.random() < 0.5) {
            gameState.particles.push({
                x: this.x, y: this.y,
                vx: -this.vx * 0.5, vy: -this.vy * 0.5,
                size: 3,
                color: '#f39c12',
                alpha: 0.6,
                life: 0.2
            });
        }

        // Nếu phù thủy đang nhắm thẳng vào một con Crab
        if (this.targetMonster && !this.targetMonster.dead) {
            if (Math.hypot(this.x - this.targetMonster.x, this.y - this.targetMonster.y) <= (this.radius + this.targetMonster.radius)) {
                this.targetMonster.takeDamage(this.damage, this.dmgType, this.owner);
                this.spawnHitExplosion(this.x, this.y);
                this.dead = true;
                return;
            }
        }

        // Crab có 10% tỉ lệ bị dính đòn bay qua từ Phù Thủy
        if (this.owner && this.owner.monsterType === 'witch' && !this.targetMonster) {
            for (let enemy of gameState.enemies) {
                if (enemy.dead || enemy.monsterType !== 'crab' || this.checkedCrabs.has(enemy)) continue;
                if (Math.hypot(this.x - enemy.x, this.y - enemy.y) <= (this.radius + enemy.radius)) {
                    this.checkedCrabs.add(enemy);
                    if (Math.random() < 0.10) {
                        enemy.takeDamage(this.damage, this.dmgType, this.owner);
                        this.spawnHitExplosion(this.x, this.y);
                        this.dead = true;
                        return;
                    }
                }
            }
        }

        for (let player of gameState.players) {
            if (player && !player.dead && !player.isResting) {
                if (player.heroType === 'magadot' && player.isLevitating) continue;

                if (Math.hypot(this.x - player.x, this.y - player.y) <= (this.radius + player.radius)) {
                    player.takeDamage(this.damage, this.dmgType, this.owner);
                    this.spawnHitExplosion(this.x, this.y);
                    this.dead = true;
                    break;
                }
            }
        }
    }

    draw(ctx) {
        if (this.spriteFolder && typeof getValidFrames === 'function') {
            const valid = getValidFrames(this.spriteFolder);
            if (valid.length > 0) {
                const frameIdx = Math.floor(this.animTime * this.spriteFps) % valid.length;
                const img = valid[frameIdx];
                if (img && img.naturalWidth > 0) {
                    ctx.save();
                    ctx.translate(this.x, this.y);
                    ctx.rotate(Math.atan2(this.vy, this.vx));
                    const w = img.naturalWidth * this.spriteScale;
                    const h = img.naturalHeight * this.spriteScale;
                    ctx.drawImage(img, -w / 2, -h / 2, w, h);
                    ctx.restore();
                    return;
                }
            }
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowColor = '#d35400';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.restore();
    }
}

// ==========================================================================
// 10. RỐI LUYỆN TẬP (TRAINING DUMMY)
// ==========================================================================
class DummyMonster extends Monster {
    constructor(x, y) {
        super(x, y, 22, '#95a5a6', {
            hp: 0,
            dame: 0,
            speed: 0,
            armor: 20,
            mr: 20,
            armorpen: 0
        });
        this.monsterType = 'dummy';
        this.isInvisible = false;
        this.totalDamageTaken = 0;
        this.dps = 0;
        this.dpsTimer = 0;
        this.damageInSecond = 0;
        this.dpc = 0;
        this.dpcResetTimer = 0;
    }

    takeDamage(amount, type, attacker = null, isCrit = false, source = 'skill') {
        let finalDmg = super.takeDamage(amount, type, attacker, isCrit, source);
        this.totalDamageTaken += finalDmg;
        this.damageInSecond += finalDmg;

        if (finalDmg > 0) {
            this.dpc += finalDmg;
            this.dpcResetTimer = 5.0;
        }

        this.stats.maxHp = 0;
        this.stats.hp = 0;
        this.dead = false;
        return finalDmg;
    }

    onDeath(killer) {
        this.stats.hp = 0;
        this.dead = false;
    }

    update(dt) {
        this.updateBurn(dt);
        if (this.armorShredTimer > 0) {
            this.armorShredTimer -= dt;
            if (this.armorShredTimer <= 0) this.armorShredVal = 0;
        }

        this.dpsTimer += dt;
        if (this.dpsTimer >= 1.0) {
            this.dps = this.damageInSecond;
            this.damageInSecond = 0;
            this.dpsTimer = 0;
        }

        if (this.dpcResetTimer > 0) {
            this.dpcResetTimer -= dt;
            if (this.dpcResetTimer <= 0) {
                this.dpcResetTimer = 0;
                this.dpc = 0;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        if (this.isInvisible) ctx.globalAlpha = 0.28;

        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(this.x - 14, this.y + 12, 28, 8);

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.isInvisible ? '#bdc3c7' : '#e67e22';
        ctx.fill();
        ctx.strokeStyle = this.isInvisible ? '#3498db' : '#d35400';
        ctx.lineWidth = 3;
        if (this.isInvisible) ctx.setLineDash([4, 4]);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#c0392b';
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        if (this.isInvisible) {
            ctx.fillStyle = "#00d2d3";
            ctx.fillText("👻 [ĐANG TÀNG HÌNH]", this.x, this.y - this.radius - 38);
        }
        ctx.fillStyle = "#ff9f43";
        ctx.fillText(`DPC: ${Math.round(this.dpc)}`, this.x, this.y - this.radius - 24);
        ctx.fillStyle = "#ffeb3b";
        ctx.fillText(`DPS: ${Math.round(this.dps)}`, this.x, this.y - this.radius - 10);
        ctx.restore();
    }
}

// ==========================================================================
// HÀM TRA CỨU & SPAWN QUÁI THEO ID HOẶC MÃ
// ==========================================================================
function spawnMonsterByCode(rawInput, x, y, waveLevel = 1) {
    if (!rawInput) return null;
    let key = rawInput.trim().toLowerCase();

    switch (key) {
        case '#z': case 'z': case 'zombie': case 'zombiemonster':
            return new ZombieMonster(x, y, waveLevel);
        case '#zk': case 'zk': case 'knight': case 'zombieknight': case 'zombieknightmonster':
            return new ZombieKnightMonster(x, y, waveLevel);
        case '#w': case 'w': case 'witch': case 'witchmonster':
            return new WitchMonster(x, y, waveLevel);
        case '#c': case 'c': case 'crab': case 'crabmonster':
            return new CrabMonster(x, y, waveLevel);
        case '#kc': case 'kc': case 'kingcrab': case 'kingcrabmonster':
            return new KingCrabMonster(x, y, waveLevel);
        case '#m': case 'm': case 'mantis': case 'mantismonster':
            return new MantisMonster(x, y, waveLevel);
        case '#ag': case 'ag': case 'arkgolem': case 'arkgolemmonster':
            return new ArkGolemMonster(x, y, waveLevel);
        case '#bag': case 'bag': case 'ancientgolem': case 'ancientgolemboss': case 'boss':
            return new AncientGolemBoss(x, y, waveLevel);
        default:
            return null;
    }
}
window.spawnMonsterByCode = spawnMonsterByCode;