/* ==========================================================================
   HỆ THỐNG THẺ ĐỘT PHÁ (SELECT.JS) - ĐỘT PHÁ SỨC MẠNH THEO 6 BẬC
   Trắng < Xanh lá < Xanh dương < Vàng < Tím < Đỏ
   ========================================================================== */

const CARD_BANNER_SPRITE = "assets/banner_cards.png"; // Lưu ảnh chứa 6 khung banner vào assets/banner_cards.png

// Đảm bảo tải trước frame hoạt ảnh tia Lazer Beam và Đạn Tracer
if (typeof getAnimFrames === 'function') {
    getAnimFrames('Projectiles/Laser Beam', 12);
    getAnimFrames('Projectiles/Bullet Tracer', 11);
}

// 6 Bậc phẩm chất tương ứng 6 dòng của ảnh (0 đến 5)
const CARD_TIERS = {
    WHITE:  { id: 'white',  index: 0, color: '#f5f6fa', name: 'Thường' },
    GREEN:  { id: 'green',  index: 1, color: '#2ed573', name: 'Đặc Biệt' },
    BLUE:   { id: 'blue',   index: 2, color: '#1e90ff', name: 'Hiếm' },
    GOLD:   { id: 'gold',   index: 3, color: '#ffa502', name: 'Sử Thi' },
    PURPLE: { id: 'purple', index: 4, color: '#a55eea', name: 'Huyền Thoại' },
    RED:    { id: 'red',    index: 5, color: '#ff4757', name: 'Thần Thoại' }
};

// CƠ SỞ DỮ LIỆU CÁC THẺ TEST THEO 6 CẤP ĐỘ
const CARDS_DATABASE = {
    'bang_ha': {
        id: 'bang_ha',
        name: 'Băng Hà',
        tier: CARD_TIERS.WHITE,
        desc: 'Đòn đánh thường có 5% làm đóng băng quái trong 5s.',
        onSelect: (player, rank) => {
            player.cardRanks['bang_ha'] = rank;
        }
    },
    'cuop_mau': {
        id: 'cuop_mau',
        name: 'Cướp Máu',
        tier: CARD_TIERS.GREEN,
        desc: 'Tiêu diệt quái +3 HP tối đa (Tối đa +30, tăng +30/phút). Mỗi cấp +thêm 3 HP/quái.',
        onSelect: (player, rank) => {
            player.cardRanks['cuop_mau'] = rank;
        }
    },
    'han_khi': {
        id: 'han_khi',
        name: 'Hàn Khí',
        tier: CARD_TIERS.BLUE,
        desc: 'Tăng +20% chỉ số cơ bản từ trang bị (+20% mỗi lần chọn).',
        onSelect: (player, rank) => {
            player.cardRanks['han_khi'] = rank;
            if (typeof recalculatePlayerStats === 'function') {
                recalculatePlayerStats(player);
            }
        }
    },
    'lazer_beam': {
        id: 'lazer_beam',
        name: 'Lazer Beam',
        tier: CARD_TIERS.GOLD,
        desc: 'Mỗi 5s bắn tia Lazer xuyên bản đồ về phía đông quái nhất gây (5% HP quái) ST phép (Mỗi cấp tăng tốc độ bắn).',
        onSelect: (player, rank) => {
            player.cardRanks['lazer_beam'] = rank;
            player.lazerTimer = 0;
        }
    },
    'don_sat_thuong': {
        id: 'don_sat_thuong',
        name: 'Dồn Sát Thương',
        tier: CARD_TIERS.PURPLE,
        desc: 'Đánh thường tích 1 điểm lên quái vĩnh viễn. Mỗi điểm gây thêm (0.5% HP quái) ST phép. Mỗi 5 điểm giật sét lan sang 3 quái.',
        onSelect: (player, rank) => {
            player.cardRanks['don_sat_thuong'] = rank;
        }
    },
    'sau_nong': {
        id: 'sau_nong',
        name: '6 Nòng',
        tier: CARD_TIERS.RED,
        desc: 'Mỗi 0.25s xả 1 viên đạn vào quái gần nhất gây (5% AD + 2.5% AP + 1% máu đã mất) ST vật lý. Sát thương gấp đôi mỗi cấp.',
        onSelect: (player, rank) => {
            player.cardRanks['sau_nong'] = rank;
            player.sauNongTimer = 0;
        }
    }
};

/* ==========================================================================
   UI CHỌN THẺ VỚI KHUNG BANNER TÁCH CHUẨN TỪ SPRITE
   ========================================================================== */
function openCardSelectCustom(pId) {
    let p = gameState.players[pId - 1];
    if (!p || p.pendingLevelUps <= 0) return;

    gameState.activeCardPlayer = pId;
    let cardModal = document.getElementById("cardModal");
    cardModal.innerHTML = `
        <div class="card-selection-box custom-card-box" style="width: 580px; max-width: 95vw; background: rgba(10, 10, 15, 0.95); border: 2px solid #ff9800; border-radius: 10px; padding: 16px;">
            <h3 id="cardPlayerTitle" style="color: #ff9800; text-align: center; margin: 0 0 14px 0; font-size: 17px; letter-spacing: 1.5px;">
                ĐỘT PHÁ SỨC MẠNH (PLAYER ${pId}) - CÒN ${p.pendingLevelUps} LẦN
            </h3>
            <div class="card-choices-container" id="customCardTrack" style="display: flex; flex-direction: column; gap: 8px;"></div>
        </div>
    `;

    let container = document.getElementById("customCardTrack");
    container.innerHTML = "";

    // Chọn ngẫu nhiên 5 thẻ không bao giờ trùng lặp
    let pool = Object.values(CARDS_DATABASE);
    let chosenCards = [];
    let tempPool = [...pool];

    while (chosenCards.length < 5 && tempPool.length > 0) {
        let randIdx = Math.floor(Math.random() * tempPool.length);
        chosenCards.push(tempPool.splice(randIdx, 1)[0]);
    }

    chosenCards.forEach(card => {
        let curRank = (p.cardRanks && p.cardRanks[card.id]) ? p.cardRanks[card.id] : 0;
        let nextRank = curRank + 1;

        // Vị trí cắt background y: 6 dải khung chia đều tương ứng index * 20%
        let bgPosY = card.tier.index * 20;

        let cardEl = document.createElement('div');
        cardEl.className = 'custom-banner-card';
        cardEl.style.cssText = `
            position: relative;
            width: 100%;
            height: 68px;
            background-image: url('${CARD_BANNER_SPRITE}');
            background-size: 100% 600%;
            background-position: 0% ${bgPosY}%;
            background-repeat: no-repeat;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
            transition: transform 0.15s ease, filter 0.15s ease;
            box-sizing: border-box;
            padding: 0 16px 0 64px;
        `;

        cardEl.onmouseenter = () => {
            cardEl.style.transform = 'scale(1.02)';
            cardEl.style.filter = 'brightness(1.18)';
        };
        cardEl.onmouseleave = () => {
            cardEl.style.transform = 'scale(1.0)';
            cardEl.style.filter = 'brightness(1.0)';
        };

        // Text ở giữa khung
        let textWrap = document.createElement('div');
        textWrap.style.cssText = `
            flex: 1;
            padding: 0 10px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            overflow: hidden;
            text-shadow: 1px 1px 2px #000, -1px -1px 2px #000;
        `;

        textWrap.innerHTML = `
            <div style="font-size: 13px; font-weight: 900; color: ${card.tier.color}; letter-spacing: 0.5px;">
                ${card.name} <span style="font-size: 11px; color: #fffa65;">(Cấp ${nextRank})</span>
            </div>
            <div style="font-size: 11px; color: #ffffff; line-height: 1.25; margin-top: 2px; font-weight: 600; white-space: normal;">
                ${card.desc}
            </div>
        `;

        // Khung ô vuông gắn ảnh bên phải
        let iconWrap = document.createElement('div');
        iconWrap.style.cssText = `
            width: 44px;
            height: 44px;
            margin-right: 4px;
            flex-shrink: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
            border-radius: 4px;
        `;

        let iconImg = document.createElement('img');
        iconImg.src = `assets/icon/${card.id}.png`;
        iconImg.style.cssText = `width: 80%; height: 80%; object-fit: contain;`;
        iconImg.onerror = () => {
            iconImg.style.display = 'none';
            iconWrap.innerHTML = `<span style="font-size: 10px; font-weight:bold; color:${card.tier.color};">${card.name.substring(0, 2)}</span>`;
        };
        iconWrap.appendChild(iconImg);

        cardEl.appendChild(textWrap);
        cardEl.appendChild(iconWrap);

        cardEl.onclick = () => {
            if (!p.cardRanks) p.cardRanks = {};
            card.onSelect(p, nextRank);
            p.pendingLevelUps--;
            cardModal.style.display = "none";
            if (p.pendingLevelUps > 0) {
                openCardSelectCustom(pId);
            }
        };

        container.appendChild(cardEl);
    });

    cardModal.style.display = "flex";
}
window.openCardSelect = openCardSelectCustom;

/* ==========================================================================
   HOOK LOGIC CHIẾN ĐẤU & KỸ NĂNG VÀO VÒNG LẶP CHÍNH
   ========================================================================== */

// 1. Hook đòn đánh thường trúng đích (Băng Hà & Dồn Sát Thương)
function hookCardOnHit(attacker, target, proj) {
    if (!attacker || !target || target.dead || !attacker.cardRanks) return;
    let isBasic = !proj || proj.attackType === 'basic_attack';
    if (!isBasic) return;

    // BĂNG HÀ (TRẮNG): 5% Đóng băng 5s
    if (attacker.cardRanks['bang_ha']) {
        if (Math.random() < 0.05) {
            target.freezeTimer = 5.0;
            target.freezeMax = 5.0;
        }
    }

    // DỒN SÁT THƯƠNG (TÍM): Tích stack vĩnh viễn, mỗi 5 stack giật sét lan 3 quái
    if (attacker.cardRanks['don_sat_thuong']) {
        let rank = attacker.cardRanks['don_sat_thuong'];
        target.donSatThuongStacks = (target.donSatThuongStacks || 0) + 1;

        let extraDmg = (0.005 * rank) * target.stats.maxHp * target.donSatThuongStacks;
        target.takeDamage(extraDmg, 'magic', attacker, false, 'skill');

        if (target.donSatThuongStacks % 5 === 0) {
            let nearby = gameState.enemies.filter(e => !e.dead && e !== target && Math.hypot(e.x - target.x, e.y - target.y) <= 220);
            nearby.sort((a, b) => Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b.x - target.x, b.y - target.y));
            let chainTargets = nearby.slice(0, 3);

            chainTargets.forEach(ct => {
                if (typeof drawCyanLightningBoltVFX === 'function') {
                    drawCyanLightningBoltVFX(target.x, target.y, ct.x, ct.y);
                }
                ct.takeDamage(extraDmg, 'magic', attacker, false, 'skill');
            });
        }
    }
}
window.hookCardOnHit = hookCardOnHit;

// 2. Hook khi tiêu diệt quái (Cướp Máu)
function hookCardOnKill(killer, victim) {
    if (!killer || !killer.cardRanks || !killer.cardRanks['cuop_mau']) return;

    let rank = killer.cardRanks['cuop_mau'];
    let hpPerKill = 3 * rank;
    let minutesPassed = Math.floor((window.matchTimer || 0) / 60) + 1;
    let maxCap = 30 * rank * minutesPassed;

    killer.cuopMauTotalGain = killer.cuopMauTotalGain || 0;
    if (killer.cuopMauTotalGain < maxCap) {
        let add = Math.min(hpPerKill, maxCap - killer.cuopMauTotalGain);
        killer.cuopMauTotalGain += add;
        killer.bonusStats.maxHp = (killer.bonusStats.maxHp || 0) + add;
        killer.stats.hp += add;
        if (typeof recalculatePlayerStats === 'function') {
            recalculatePlayerStats(killer);
        }
    }
}
window.hookCardOnKill = hookCardOnKill;

// 3. Cập nhật kỹ năng chủ động từ thẻ (Lazer Beam & Súng 6 Nòng)
function updateCardActiveSkills(dt) {
    if (!gameState.active || !gameState.players) return;

    gameState.players.forEach(p => {
        if (p.dead || !p.cardRanks) return;

        // LAZER BEAM (VÀNG): Chu kỳ 5 / rank giây
        if (p.cardRanks['lazer_beam']) {
            let rank = p.cardRanks['lazer_beam'];
            let interval = 5.0 / rank;
            p.lazerTimer = (p.lazerTimer || 0) + dt;

            if (p.lazerTimer >= interval) {
                p.lazerTimer = 0;
                fireLazerBeamFromPlayer(p);
            }
        }

        // SÚNG 6 NÒNG (ĐỎ): Mỗi 0.25s xả 1 viên
        if (p.cardRanks['sau_nong']) {
            let rank = p.cardRanks['sau_nong'];
            p.sauNongTimer = (p.sauNongTimer || 0) + dt;

            if (p.sauNongTimer >= 0.25) {
                p.sauNongTimer = 0;
                fireSauNongBullet(p, rank);
            }
        }
    });
}
window.updateCardActiveSkills = updateCardActiveSkills;

// Bắn tia Lazer nối đuôi xuyên map
function fireLazerBeamFromPlayer(player) {
    let enemies = gameState.enemies.filter(e => !e.dead);
    let targetAngle = player.angle || 0;

    // Tìm góc có mật độ quái dày nhất
    if (enemies.length > 0) {
        let bestCount = -1;
        for (let enemy of enemies) {
            let angle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
            let count = enemies.filter(e => {
                let diff = Math.atan2(Math.sin(Math.atan2(e.y - player.y, e.x - player.x) - angle), Math.cos(Math.atan2(e.y - player.y, e.x - player.x) - angle));
                return Math.abs(diff) < Math.PI / 8;
            }).length;

            if (count > bestCount) {
                bestCount = count;
                targetAngle = angle;
            }
        }
    }

    let rayLength = 3500;
    let cosA = Math.cos(targetAngle);
    let sinA = Math.sin(targetAngle);

    gameState.enemies.forEach(e => {
        if (e.dead) return;
        let toX = e.x - player.x;
        let toY = e.y - player.y;
        let proj = toX * cosA + toY * sinA;
        if (proj >= 0 && proj <= rayLength) {
            let perp = Math.abs(toX * (-sinA) + toY * cosA);
            if (perp <= 20 + e.radius) { // Hitbox hẹp
                let dmg = e.stats.maxHp * 0.05;
                e.takeDamage(dmg, 'magic', player, false, 'skill');
            }
        }
    });

    gameState.animatedEffects.push(new FullMapLaserEffect(player.x, player.y, targetAngle, rayLength));
}

// Đối tượng diễn hoạt tia Lazer x3 sprite
class FullMapLaserEffect {
    constructor(startX, startY, angle, length) {
        this.startX = startX;
        this.startY = startY;
        this.angle = angle;
        this.length = length;
        this.time = 0;
        this.duration = 0.55;
        this.dead = false;
        this.frames = getValidFrames('Projectiles/Laser Beam');
    }

    update(dt) {
        this.time += dt;
        if (this.time >= this.duration) this.dead = true;
    }

    draw(ctx) {
        let valid = getValidFrames('Projectiles/Laser Beam');
        if (valid.length === 0) return;

        let frameIdx = Math.floor((this.time / this.duration) * 12) % valid.length;
        let img = valid[frameIdx];
        if (!img || !img.naturalWidth) return;

        ctx.save();
        ctx.translate(this.startX, this.startY);
        ctx.rotate(this.angle);

        let scale = 3.0; // Phóng to gấp 3 theo yêu cầu
        let segW = img.naturalWidth * scale;
        let segH = img.naturalHeight * scale;
        let numSegs = Math.ceil(this.length / segW);

        for (let i = 0; i < numSegs; i++) {
            ctx.drawImage(img, i * segW, -segH / 2, segW, segH);
        }
        ctx.restore();
    }
}

// Bắn đạn súng 6 Nòng
function fireSauNongBullet(player, rank) {
    let nearest = null;
    let minDist = 750;

    gameState.enemies.forEach(e => {
        if (e.dead) return;
        let d = Math.hypot(e.x - player.x, e.y - player.y);
        if (d < minDist) { minDist = d; nearest = e; }
    });

    if (!nearest) return;

    let angle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
    let missingHp = nearest.stats.maxHp - nearest.stats.hp;
    let baseDmg = (player.stats.ad * 0.05 + player.stats.ap * 0.025 + missingHp * 0.01) * Math.pow(2, rank - 1);

    let isCrit = Math.random() * 100 < (player.stats.critRate + 5);
    if (isCrit) baseDmg *= (2.0 + (player.stats.critDamage || 0) / 100);

    gameState.projectiles.push(new Projectile({
        owner: player,
        attackType: 'skill',
        x: player.x,
        y: player.y,
        vx: Math.cos(angle),
        vy: Math.sin(angle),
        radius: 4.5,
        speed: 18,
        damage: baseDmg,
        dmgType: 'physical',
        color: '#ff4757',
        isCrit: isCrit,
        range: 700,
        spriteFolder: 'Projectiles/Bullet Tracer',
        spriteScale: 1.15
    }));
}

// 4. Vẽ khối băng lục giác lên quái bị đóng băng
function drawHexagonIceBlock(ctx, enemy) {
    if (!enemy.freezeTimer || enemy.freezeTimer <= 0) return;

    let alpha = 0.85;
    // Còn 1s nhấp nháy nhanh dần và mờ đi, tan ra
    if (enemy.freezeTimer <= 1.0) {
        let flicker = Math.sin((1.0 - enemy.freezeTimer) * 28);
        alpha = flicker > 0 ? 0.75 : 0.20;
    }

    let cx = enemy.x;
    let cy = enemy.y;
    let r = enemy.radius * 1.55;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        let a = (i * Math.PI / 3) + Math.PI / 6;
        let px = cx + r * Math.cos(a);
        let py = cy + r * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();

    ctx.fillStyle = "rgba(129, 236, 236, 0.45)";
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#00cec9";
    ctx.stroke();

    // Các đường gân tinh thể băng
    ctx.beginPath();
    for (let i = 0; i < 6; i += 2) {
        let a1 = (i * Math.PI / 3) + Math.PI / 6;
        let a2 = ((i + 3) * Math.PI / 3) + Math.PI / 6;
        ctx.moveTo(cx + r * Math.cos(a1), cy + r * Math.sin(a1));
        ctx.lineTo(cx + r * Math.cos(a2), cy + r * Math.sin(a2));
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
}
window.drawHexagonIceBlock = drawHexagonIceBlock;