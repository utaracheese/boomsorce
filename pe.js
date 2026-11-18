// ==========================================================================
// FILE: pe.js - GIAO DIỆN & ĐIỀU KHIỂN CHẾ ĐỘ PE (MÀN HÌNH DỌC - 1 NGƯỜI CHƠI)
// ==========================================================================

(function () {
    // ======================================================================
    // CẤU HÌNH GÓC NHÌN & ĐIỀU KHIỂN PE (BẠN CÓ THỂ TỰ CHỈNH THÔNG SỐ Ở ĐÂY)
    // ======================================================================
    const PE_CONFIG = {
        defaultCameraZoom: 0.68, // Góc nhìn mặc định cho PE màn hình dọc (càng nhỏ nhìn càng rộng)
        minCameraZoom: 0.35,     // Thu nhỏ tối đa (nhìn rất rộng)
        maxCameraZoom: 1.30,     // Phóng to tối đa
        zoomStep: 0.04,          // Bước tăng/giảm mỗi lần bấm +/-
        joystickMaxDist: 44,     // Bán kính kéo cần gạt joystick (px)
        autoAttackDefault: true  // Mặc định bật Auto Attack khi vào PE
    };

    // Đọc lại góc nhìn đã chỉnh lần trước (nếu có)
    let savedZoom = parseFloat(localStorage.getItem('pe_camera_zoom'));
    if (isNaN(savedZoom) || savedZoom < PE_CONFIG.minCameraZoom || savedZoom > PE_CONFIG.maxCameraZoom) {
        savedZoom = PE_CONFIG.defaultCameraZoom;
    }

    const peState = {
        enabled: false,          // Mặc định khởi đầu là PC
        cameraZoom: savedZoom,
        autoAttack: PE_CONFIG.autoAttackDefault,
        manualFreeze: false,     // Nút đóng băng chủ động
        joyX: 0,
        joyY: 0,
        joyTouchId: null,
        joyCenterX: 0,
        joyCenterY: 0,
        aimTouchId: null,
        isManualAiming: false,
        manualWorldX: 0,
        manualWorldY: 0,
        lastManualAngle: 0,
        lastManualTime: 0,
        zoomPanelOpen: false
    };
    window.peState = peState;

    // ======================================================================
    // TIỆN ÍCH XÁC ĐỊNH TẦM ĐÁNH & MỤC TIÊU
    // ======================================================================
    function getHeroAttackRange(p) {
        if (!p) return 450;
        switch (p.heroType) {
            case 'rivent': return 480;
            case 'wirdor': return 450;
            case 'gorox': return 460;
            case 'yumakai': return 500;
            case 'taking': return 135;
            case 'magadot': return p.currentWeapon === 'bow' ? 460 : 105;
            default: return 450;
        }
    }

    function getValidEnemies() {
        if (!window.gameState || !Array.isArray(gameState.enemies)) return [];
        return gameState.enemies.filter(e => !e.dead && !(e.monsterType === 'dummy' && e.isInvisible));
    }

    function getClosestEnemy(p) {
        let list = getValidEnemies();
        let best = null;
        let minDist = Infinity;
        for (let e of list) {
            let d = Math.hypot(e.x - p.x, e.y - p.y);
            if (d < minDist) {
                minDist = d;
                best = e;
            }
        }
        return best;
    }

    // Tìm quái tại hướng/điểm người chơi vừa nhấn khi Auto Attack OFF
    function findTargetInDirection(p, wx, wy, maxSearchDist) {
        let list = getValidEnemies();
        if (list.length === 0) return null;

        let tapAngle = Math.atan2(wy - p.y, wx - p.x);

        // 1. Ưu tiên quái nằm gần ngay điểm chạm
        let nearTap = null;
        let minTapDist = Infinity;
        for (let e of list) {
            let dTap = Math.hypot(e.x - wx, e.y - wy);
            let dHero = Math.hypot(e.x - p.x, e.y - p.y);
            if (dTap <= e.radius + 55 && dHero <= maxSearchDist + e.radius) {
                if (dTap < minTapDist) {
                    minTapDist = dTap;
                    nearTap = e;
                }
            }
        }
        if (nearTap) return nearTap;

        // 2. Tìm quái nằm trong hình nón theo hướng đã ấn
        let bestInCone = null;
        let bestScore = Infinity;
        const maxConeAngle = Math.PI / 4; // ~45 độ mỗi bên

        for (let e of list) {
            let dHero = Math.hypot(e.x - p.x, e.y - p.y);
            if (dHero > maxSearchDist + e.radius) continue;

            let eAngle = Math.atan2(e.y - p.y, e.x - p.x);
            let diff = Math.abs(Math.atan2(Math.sin(eAngle - tapAngle), Math.cos(eAngle - tapAngle)));
            if (diff <= maxConeAngle) {
                // Điểm ưu tiên theo độ lệch góc và khoảng cách
                let score = dHero + diff * 220;
                if (score < bestScore) {
                    bestScore = score;
                    bestInCone = e;
                }
            }
        }
        return bestInCone;
    }

    function computeSkillAim(p) {
        if (!p) return 0;

        if (peState.autoAttack) {
            let nearest = getClosestEnemy(p);
            if (nearest) {
                gameState.mouse.worldX = nearest.x;
                gameState.mouse.worldY = nearest.y;
                return Math.atan2(nearest.y - p.y, nearest.x - p.x);
            }
            gameState.mouse.worldX = p.x + Math.cos(p.angle) * 260;
            gameState.mouse.worldY = p.y + Math.sin(p.angle) * 260;
            return p.angle;
        } else {
            // Chế độ thủ công: tìm mục tiêu theo hướng vừa nhấn (trong 4s gần nhất), nếu không có thì lấy quái gần nhất
            let target = null;
            if (Date.now() - peState.lastManualTime < 4000) {
                target = findTargetInDirection(p, peState.manualWorldX, peState.manualWorldY, 700);
            }
            if (!target) {
                target = getClosestEnemy(p);
            }
            if (target) {
                gameState.mouse.worldX = target.x;
                gameState.mouse.worldY = target.y;
                return Math.atan2(target.y - p.y, target.x - p.x);
            }
            if (Date.now() - peState.lastManualTime < 4000) {
                gameState.mouse.worldX = peState.manualWorldX;
                gameState.mouse.worldY = peState.manualWorldY;
                return peState.lastManualAngle;
            }
            gameState.mouse.worldX = p.x + Math.cos(p.angle) * 260;
            gameState.mouse.worldY = p.y + Math.sin(p.angle) * 260;
            return p.angle;
        }
    }

    // ======================================================================
    // TIÊM CSS GIAO DIỆN PE (KHÔNG CẦN SỬA STYLE.CSS)
    // ======================================================================
    function injectPEStyles() {
        if (document.getElementById('peDynamicStyle')) return;
        const style = document.createElement('style');
        style.id = 'peDynamicStyle';
        style.textContent = `
            /* Bộ chuyển đổi giao diện PC / PE ở góc trên cùng bên phải */
            #peModeSwitcher {
                position: fixed;
                top: 8px;
                right: 10px;
                z-index: 25000;
                display: flex;
                background: rgba(12, 14, 22, 0.9);
                border: 1.5px solid #00e5ff;
                border-radius: 20px;
                padding: 2px;
                gap: 2px;
                box-shadow: 0 0 12px rgba(0, 229, 255, 0.35);
                pointer-events: auto;
            }
            .pe-switch-btn {
                border: none;
                background: transparent;
                color: #94a3b8;
                font-size: 11px;
                font-weight: 900;
                padding: 4px 10px;
                border-radius: 16px;
                cursor: pointer;
                transition: 0.15s;
            }
            .pe-switch-btn.active {
                background: #00e5ff;
                color: #000000;
            }

            /* Đẩy nhẹ bảng chỉ số P2 ở chế độ PC xuống để không bị nút PC/PE che */
            body:not(.pe-mode) #p2StatsCorner {
                top: 44px;
            }

            /* ===== KHI BẬT CHẾ ĐỘ PE ===== */
            body.pe-mode canvas {
                touch-action: none;
            }

            /* Ẩn P2 ở Lobby & sắp xếp lại Lobby cho màn hình dọc */
            body.pe-mode #selectScreen {
                padding: 44px 12px 12px 12px;
                overflow-y: auto;
                align-items: flex-start;
            }
            body.pe-mode .lobby-new-layout {
                height: auto;
                min-height: calc(100vh - 58px);
                gap: 12px;
            }
            body.pe-mode .lobby-top-section {
                flex-direction: column;
                gap: 12px;
            }
            body.pe-mode .hero-row-box:nth-child(2) {
                display: none !important;
            }
            body.pe-mode .modes-select-column {
                width: 100%;
                flex-direction: row;
                height: 52px;
                gap: 10px;
            }
            body.pe-mode .mode-select-btn {
                font-size: 16px;
            }
            body.pe-mode .lobby-bottom-section {
                flex-direction: column;
                height: auto;
                gap: 12px;
            }
            body.pe-mode .info-controls-cluster {
                flex-direction: column;
                gap: 10px;
            }
            body.pe-mode .how-to-play-box {
                display: none !important;
            }
            body.pe-mode .match-settings-box {
                width: 100%;
                flex-direction: row;
            }
            body.pe-mode .btn-start-match {
                flex: 1;
                width: auto;
                height: 52px;
                font-size: 18px;
                clip-path: none;
                border-radius: 6px;
            }
            body.pe-mode .btn-code-test {
                height: 52px;
                font-size: 12px;
                padding: 0 12px;
            }

            /* Ẩn HUD PC cũ (thông số tướng, nút nghỉ, thanh máu/mana GUI) khi ở PE */
            body.pe-mode #p1StatsCorner,
            body.pe-mode #p2StatsCorner,
            body.pe-mode #hudP1,
            body.pe-mode #hudP2 {
                display: none !important;
            }

            /* Chỉnh đồng hồ & thanh máu Boss gọn cho màn hình dọc */
            body.pe-mode #matchClock {
                top: 8px;
                font-size: 14px;
                padding: 4px 12px;
            }
            body.pe-mode #bossHpContainer {
                top: 44px;
                width: 88vw;
                max-width: 320px;
                padding: 4px 8px;
            }
            body.pe-mode #practiceSettingBtn {
                top: 44px;
                left: auto;
                right: 10px;
                transform: none;
                font-size: 11px;
                padding: 4px 8px;
            }

            /* ===== HUD RIÊNG CHO PE ===== */
            #peHudLayer {
                position: fixed;
                inset: 0;
                pointer-events: none;
                z-index: 180;
                display: none;
            }
            body.pe-mode.pe-ingame #peHudLayer {
                display: block;
            }

            /* Cụm trên trái: Shop, Vàng, Đóng Băng, Level */
            .pe-top-left-bar {
                position: absolute;
                top: 8px;
                left: 8px;
                display: flex;
                flex-direction: column;
                gap: 6px;
                pointer-events: auto;
            }
            .pe-top-btn-row {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .pe-pill-btn {
                background: rgba(15, 18, 28, 0.86);
                border: 1.5px solid #ffb300;
                color: #fff;
                border-radius: 8px;
                padding: 6px 10px;
                font-size: 12px;
                font-weight: 800;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 5px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.6);
                touch-action: manipulation;
            }
            .pe-pill-btn.freeze-btn {
                border-color: #00e5ff;
                color: #e0f7fa;
            }
            .pe-pill-btn.freeze-btn.frozen {
                background: #0288d1;
                border-color: #ffffff;
                box-shadow: 0 0 14px rgba(0, 229, 255, 0.8);
            }
            .pe-lv-badge {
                background: rgba(15, 18, 28, 0.86);
                border: 1.5px solid #ffeb3b;
                color: #ffeb3b;
                border-radius: 50%;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: 900;
                position: relative;
                cursor: pointer;
            }
            .pe-lv-dot {
                position: absolute;
                top: -2px;
                right: -2px;
                width: 9px;
                height: 9px;
                background: #ff3838;
                border: 1px solid #fff;
                border-radius: 50%;
                display: none;
            }

            /* Cụm chỉnh Góc Nhìn (Camera Zoom) dưới nút PC/PE ở góc trên phải */
            .pe-zoom-widget {
                position: absolute;
                top: 40px;
                right: 10px;
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 4px;
                pointer-events: auto;
            }
            .pe-zoom-toggle {
                background: rgba(15, 18, 28, 0.82);
                border: 1px solid #64748b;
                color: #e2e8f0;
                border-radius: 14px;
                padding: 4px 10px;
                font-size: 11px;
                font-weight: bold;
                cursor: pointer;
            }
            .pe-zoom-controls {
                display: none;
                align-items: center;
                gap: 6px;
                background: rgba(15, 18, 28, 0.92);
                border: 1.5px solid #00e5ff;
                border-radius: 10px;
                padding: 6px 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.75);
            }
            .pe-zoom-controls.open {
                display: flex;
            }
            .pe-zoom-step-btn {
                width: 26px;
                height: 26px;
                border-radius: 6px;
                border: 1px solid #475569;
                background: #1e293b;
                color: #fff;
                font-size: 15px;
                font-weight: bold;
                cursor: pointer;
            }
            #peZoomSlider {
                width: 90px;
                accent-color: #00e5ff;
            }

            /* Thông báo trạng thái đóng băng */
            #peFreezeBanner {
                position: absolute;
                top: 86px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 140, 200, 0.85);
                border: 1.5px solid #ffffff;
                color: #ffffff;
                padding: 4px 14px;
                border-radius: 16px;
                font-size: 12px;
                font-weight: 900;
                letter-spacing: 1px;
                display: none;
                pointer-events: none;
                box-shadow: 0 0 15px rgba(0, 229, 255, 0.6);
            }

            /* 3 Nút chiêu làm mờ ở cạnh trái màn hình */
            .pe-skills-left-col {
                position: absolute;
                left: 12px;
                bottom: 145px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                pointer-events: auto;
            }
            .pe-skill-circle {
                width: 56px;
                height: 56px;
                border-radius: 50%;
                background: rgba(20, 24, 34, 0.55);
                border: 2px solid rgba(255, 255, 255, 0.45);
                color: #ffffff;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                position: relative;
                overflow: hidden;
                opacity: 0.62;
                transition: transform 0.08s, opacity 0.1s;
                touch-action: none;
                user-select: none;
                backdrop-filter: blur(2px);
            }
            .pe-skill-circle:active,
            .pe-skill-circle.pressed {
                transform: scale(0.92);
                opacity: 0.95;
                border-color: #00e5ff;
            }
            .pe-skill-circle.no-mana {
                border-color: rgba(52, 152, 219, 0.5);
                color: #74b9ff;
            }
            .pe-skill-label {
                font-size: 13px;
                font-weight: 900;
                z-index: 2;
                text-shadow: 0 1px 3px #000;
            }
            .pe-skill-cd-fill {
                position: absolute;
                bottom: 0;
                left: 0;
                width: 100%;
                height: 0%;
                background: rgba(0, 0, 0, 0.72);
                z-index: 1;
            }
            .pe-skill-cd-num {
                position: absolute;
                font-size: 13px;
                font-weight: 900;
                color: #ffeb3b;
                z-index: 3;
                text-shadow: 0 0 4px #000;
                display: none;
            }
            .pe-chest-btn {
                width: 56px;
                height: 36px;
                border-radius: 10px;
                background: rgba(230, 126, 34, 0.75);
                border: 1.5px solid #ffeb3b;
                color: #fff;
                font-size: 10px;
                font-weight: 900;
                display: none;
                align-items: center;
                justify-content: center;
                touch-action: none;
            }

            /* Nút di chuyển tròn (Joystick) ở giữa phía dưới + Nút nhỏ Auto Attack */
            .pe-bottom-controls {
                position: absolute;
                bottom: 22px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 10px;
                pointer-events: none;
            }
            #peAutoAttackBtn {
                pointer-events: auto;
                padding: 4px 12px;
                border-radius: 14px;
                font-size: 11px;
                font-weight: 900;
                letter-spacing: 0.5px;
                border: 1.5px solid #2ecc71;
                background: rgba(22, 160, 133, 0.85);
                color: #ffffff;
                cursor: pointer;
                box-shadow: 0 2px 8px rgba(0,0,0,0.5);
                touch-action: manipulation;
            }
            #peAutoAttackBtn.off {
                border-color: #e74c3c;
                background: rgba(140, 35, 35, 0.82);
                color: #ffd6d6;
            }
            .pe-joystick-base {
                pointer-events: auto;
                width: 116px;
                height: 116px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.10);
                border: 2px solid rgba(255, 255, 255, 0.35);
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                touch-action: none;
                box-shadow: inset 0 0 18px rgba(0, 0, 0, 0.45);
            }
            .pe-joystick-knob {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: radial-gradient(circle at 35% 35%, rgba(0, 229, 255, 0.9), rgba(0, 140, 180, 0.75));
                border: 2px solid rgba(255, 255, 255, 0.85);
                position: absolute;
                transform: translate(0px, 0px);
                pointer-events: none;
                box-shadow: 0 2px 10px rgba(0, 229, 255, 0.45);
            }

            /* Modal Shop & Chọn Thẻ tối ưu cho màn hình dọc PE */
            body.pe-mode .shop-container {
                width: 96vw;
                max-width: 520px;
                height: 86vh;
                max-height: 760px;
            }
            body.pe-mode .shop-header {
                padding: 8px 10px;
                flex-wrap: wrap;
                gap: 6px;
                font-size: 13px;
            }
            body.pe-mode .shop-header h3 {
                margin: 0;
                font-size: 14px;
            }
            body.pe-mode .shop-tabs {
                padding: 6px 8px;
                overflow-x: auto;
            }
            body.pe-mode .tab-btn {
                padding: 5px 10px;
                font-size: 11px;
                white-space: nowrap;
            }
            body.pe-mode .shop-content {
                flex-direction: column;
            }
            body.pe-mode .shop-items-grid {
                flex: 1.25;
                grid-template-columns: repeat(2, 1fr);
                border-right: none;
                border-bottom: 1px solid #333;
                padding: 8px;
            }
            body.pe-mode .shop-item-preview {
                flex: 1;
                padding: 10px;
            }
            body.pe-mode .shop-inventory-row {
                flex-direction: column;
                align-items: flex-start;
                gap: 6px;
                padding: 8px 10px;
            }
            body.pe-mode .inv-slots {
                width: 100%;
                justify-content: space-between;
            }
            body.pe-mode .inv-slot {
                width: 44px;
                height: 44px;
                position: relative;
            }
            body.pe-mode .pe-inv-name-tag {
                position: absolute;
                bottom: -1px;
                left: 0;
                right: 0;
                background: rgba(0,0,0,0.82);
                color: #ffeb3b;
                font-size: 8px;
                line-height: 10px;
                text-align: center;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
                padding: 0 2px;
                pointer-events: none;
            }

            body.pe-mode .card-selection-box,
            body.pe-mode .custom-card-box {
                width: 95vw !important;
                max-width: 480px !important;
                max-height: 88vh;
                overflow-y: auto;
                padding: 12px !important;
            }
            body.pe-mode .practice-modal-container {
                width: 92vw;
                max-width: 380px;
            }
        `;
        document.head.appendChild(style);
    }

    // ======================================================================
    // TẠO GIAO DIỆN DOM CHO PE (NÚT SWITCH PC/PE + HUD PE)
    // ======================================================================
    function createPEDomElements() {
        // 1. Bộ chọn PC / PE ở góc trên cùng
        if (!document.getElementById('peModeSwitcher')) {
            const switcher = document.createElement('div');
            switcher.id = 'peModeSwitcher';
            switcher.innerHTML = `
                <button type="button" id="btnModePC" class="pe-switch-btn active">🖥️ PC</button>
                <button type="button" id="btnModePE" class="pe-switch-btn">📱 PE</button>
            `;
            document.body.appendChild(switcher);

            document.getElementById('btnModePC').addEventListener('click', (e) => {
                e.stopPropagation();
                setPEMode(false);
            });
            document.getElementById('btnModePE').addEventListener('click', (e) => {
                e.stopPropagation();
                setPEMode(true);
            });
        }

        // 2. Layer HUD riêng cho PE
        if (!document.getElementById('peHudLayer')) {
            const hud = document.createElement('div');
            hud.id = 'peHudLayer';
            hud.innerHTML = `
                <div class="pe-top-left-bar">
                    <div class="pe-top-btn-row">
                        <button type="button" id="peShopBtn" class="pe-pill-btn">
                            🛒 SHOP <span id="peGoldText" style="color:#ffb300;">500</span>💰
                        </button>
                        <div id="peLvBadge" class="pe-lv-badge" title="Thẻ nâng cấp">
                            <span id="peLvText">1</span>
                            <div id="peLvDot" class="pe-lv-dot"></div>
                        </div>
                    </div>
                    <div class="pe-top-btn-row">
                        <button type="button" id="peFreezeBtn" class="pe-pill-btn freeze-btn">
                            ❄️ Đóng Băng
                        </button>
                    </div>
                </div>

                <div class="pe-zoom-widget">
                    <button type="button" id="peZoomToggleBtn" class="pe-zoom-toggle">
                        🔍 Góc nhìn: <span id="peZoomValLabel">${peState.cameraZoom.toFixed(2)}x</span>
                    </button>
                    <div id="peZoomControls" class="pe-zoom-controls">
                        <button type="button" id="peZoomOutBtn" class="pe-zoom-step-btn">-</button>
                        <input type="range" id="peZoomSlider" min="${PE_CONFIG.minCameraZoom}" max="${PE_CONFIG.maxCameraZoom}" step="0.01" value="${peState.cameraZoom}">
                        <button type="button" id="peZoomInBtn" class="pe-zoom-step-btn">+</button>
                    </div>
                </div>

                <div id="peFreezeBanner">❄️ TRÒ CHƠI ĐANG ĐÓNG BĂNG</div>

                <div class="pe-skills-left-col">
                    <button type="button" id="peChestBtn" class="pe-chest-btn">📦 ĐỔI VK</button>
                    <button type="button" id="peSkill1Btn" class="pe-skill-circle">
                        <span class="pe-skill-label">C1</span>
                        <div id="peSkill1Cd" class="pe-skill-cd-fill"></div>
                        <span id="peSkill1CdNum" class="pe-skill-cd-num"></span>
                    </button>
                    <button type="button" id="peSkill2Btn" class="pe-skill-circle">
                        <span class="pe-skill-label">C2</span>
                        <div id="peSkill2Cd" class="pe-skill-cd-fill"></div>
                        <span id="peSkill2CdNum" class="pe-skill-cd-num"></span>
                    </button>
                    <button type="button" id="peSkill3Btn" class="pe-skill-circle">
                        <span class="pe-skill-label">C3</span>
                        <div id="peSkill3Cd" class="pe-skill-cd-fill"></div>
                        <span id="peSkill3CdNum" class="pe-skill-cd-num"></span>
                    </button>
                </div>

                <div class="pe-bottom-controls">
                    <button type="button" id="peAutoAttackBtn" class="${peState.autoAttack ? '' : 'off'}">
                        ${peState.autoAttack ? '⚔️ AUTO: ON' : '🎯 AUTO: OFF'}
                    </button>
                    <div id="peJoystickBase" class="pe-joystick-base">
                        <div id="peJoystickKnob" class="pe-joystick-knob"></div>
                    </div>
                </div>
            `;
            document.body.appendChild(hud);

            bindPEHudEvents();
        }
    }

    function updateZoomUI(newZoom) {
        let clamped = Math.max(PE_CONFIG.minCameraZoom, Math.min(PE_CONFIG.maxCameraZoom, newZoom));
        peState.cameraZoom = Math.round(clamped * 100) / 100;
        localStorage.setItem('pe_camera_zoom', String(peState.cameraZoom));

        const lbl = document.getElementById('peZoomValLabel');
        const slider = document.getElementById('peZoomSlider');
        if (lbl) lbl.innerText = peState.cameraZoom.toFixed(2) + 'x';
        if (slider) slider.value = peState.cameraZoom;
    }

    function bindPEHudEvents() {
        const stop = (e) => { e.stopPropagation(); };

        // Mở Shop (đóng băng game)
        const shopBtn = document.getElementById('peShopBtn');
        shopBtn.addEventListener('click', (e) => {
            stop(e);
            if (typeof window.toggleShop === 'function') window.toggleShop(1);
        });

        // Mở bảng chọn thẻ (nếu còn lượt)
        const lvBadge = document.getElementById('peLvBadge');
        lvBadge.addEventListener('click', (e) => {
            stop(e);
            if (typeof window.openCardSelect === 'function') window.openCardSelect(1);
        });

        // Nút Đóng Băng Trò Chơi
        const freezeBtn = document.getElementById('peFreezeBtn');
        freezeBtn.addEventListener('click', (e) => {
            stop(e);
            peState.manualFreeze = !peState.manualFreeze;
            freezeBtn.classList.toggle('frozen', peState.manualFreeze);
            freezeBtn.innerText = peState.manualFreeze ? '▶️ Tiếp Tục' : '❄️ Đóng Băng';
        });

        // Điều chỉnh Góc Nhìn (Camera Zoom)
        const zoomToggleBtn = document.getElementById('peZoomToggleBtn');
        const zoomControls = document.getElementById('peZoomControls');
        const zoomSlider = document.getElementById('peZoomSlider');
        const zoomOutBtn = document.getElementById('peZoomOutBtn');
        const zoomInBtn = document.getElementById('peZoomInBtn');

        zoomToggleBtn.addEventListener('click', (e) => {
            stop(e);
            peState.zoomPanelOpen = !peState.zoomPanelOpen;
            zoomControls.classList.toggle('open', peState.zoomPanelOpen);
        });
        zoomSlider.addEventListener('input', (e) => {
            stop(e);
            updateZoomUI(parseFloat(e.target.value));
        });
        zoomOutBtn.addEventListener('click', (e) => {
            stop(e);
            updateZoomUI(peState.cameraZoom - PE_CONFIG.zoomStep);
        });
        zoomInBtn.addEventListener('click', (e) => {
            stop(e);
            updateZoomUI(peState.cameraZoom + PE_CONFIG.zoomStep);
        });

        // Bật/Tắt Auto Attack
        const autoBtn = document.getElementById('peAutoAttackBtn');
        autoBtn.addEventListener('click', (e) => {
            stop(e);
            peState.autoAttack = !peState.autoAttack;
            autoBtn.classList.toggle('off', !peState.autoAttack);
            autoBtn.innerText = peState.autoAttack ? '⚔️ AUTO: ON' : '🎯 AUTO: OFF';
        });

        // Nút đổi vũ khí cạnh rương cho Magadot
        const chestBtn = document.getElementById('peChestBtn');
        chestBtn.addEventListener('click', (e) => {
            stop(e);
            let p1 = gameState && gameState.players ? gameState.players[0] : null;
            if (p1 && !p1.dead && typeof p1.interactChest === 'function') {
                p1.interactChest();
            }
        });

        // 3 Nút Chiêu bên cạnh trái
        [1, 2, 3].forEach(idx => {
            const btn = document.getElementById(`peSkill${idx}Btn`);
            const fireSkill = (e) => {
                if (e.cancelable) e.preventDefault();
                e.stopPropagation();
                if (!peState.enabled || !gameState.active) return;

                let p1 = gameState.players[0];
                if (!p1 || p1.dead || peState.manualFreeze) return;

                btn.classList.add('pressed');
                setTimeout(() => btn.classList.remove('pressed'), 120);

                let aim = computeSkillAim(p1);
                if (typeof hookOnCastSkillItems === 'function') hookOnCastSkillItems(p1);

                if (idx === 1) {
                    if (p1.heroType === 'gorox') p1.castSkill1();
                    else p1.castSkill1(aim);
                } else if (idx === 2) {
                    if (p1.heroType === 'wirdor' || p1.heroType === 'magadot') p1.castSkill2(aim);
                    else p1.castSkill2();
                } else if (idx === 3) {
                    p1.castSkill3(aim);
                }
            };

            btn.addEventListener('touchstart', fireSkill, { passive: false });
            btn.addEventListener('mousedown', (e) => {
                if (e.button === 0) fireSkill(e);
            });
        });

        // Joystick tròn ở giữa phía dưới (hỗ trợ Touch & Chuột)
        const joyBase = document.getElementById('peJoystickBase');
        const joyKnob = document.getElementById('peJoystickKnob');

        function updateJoystickPos(clientX, clientY) {
            let rect = joyBase.getBoundingClientRect();
            let cx = rect.left + rect.width / 2;
            let cy = rect.top + rect.height / 2;
            let dx = clientX - cx;
            let dy = clientY - cy;
            let dist = Math.hypot(dx, dy);
            let maxD = PE_CONFIG.joystickMaxDist;

            if (dist > maxD && dist > 0.001) {
                dx = (dx / dist) * maxD;
                dy = (dy / dist) * maxD;
            }

            peState.joyX = dx / maxD;
            peState.joyY = dy / maxD;
            joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
        }

        function resetJoystick() {
            peState.joyTouchId = null;
            peState.joyX = 0;
            peState.joyY = 0;
            joyKnob.style.transform = 'translate(0px, 0px)';
        }

        joyBase.addEventListener('touchstart', (e) => {
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();
            if (peState.joyTouchId === null && e.changedTouches.length > 0) {
                let t = e.changedTouches[0];
                peState.joyTouchId = t.identifier;
                updateJoystickPos(t.clientX, t.clientY);
            }
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            if (peState.joyTouchId === null) return;
            for (let t of e.changedTouches) {
                if (t.identifier === peState.joyTouchId) {
                    updateJoystickPos(t.clientX, t.clientY);
                    break;
                }
            }
        }, { passive: true });

        window.addEventListener('touchend', (e) => {
            if (peState.joyTouchId === null) return;
            for (let t of e.changedTouches) {
                if (t.identifier === peState.joyTouchId) {
                    resetJoystick();
                    break;
                }
            }
        });
        window.addEventListener('touchcancel', (e) => {
            if (peState.joyTouchId === null) return;
            for (let t of e.changedTouches) {
                if (t.identifier === peState.joyTouchId) {
                    resetJoystick();
                    break;
                }
            }
        });

        // Hỗ trợ kéo joystick bằng chuột (để test PE trên trình duyệt PC)
        let mouseJoyDown = false;
        joyBase.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            e.stopPropagation();
            mouseJoyDown = true;
            updateJoystickPos(e.clientX, e.clientY);
        });
        window.addEventListener('mousemove', (e) => {
            if (!mouseJoyDown) return;
            updateJoystickPos(e.clientX, e.clientY);
        });
        window.addEventListener('mouseup', () => {
            if (!mouseJoyDown) return;
            mouseJoyDown = false;
            resetJoystick();
        });

        // Chạm lên màn hình Canvas khi AUTO: OFF để chỉ hướng đánh
        const canvasEl = document.getElementById('gameCanvas');
        if (canvasEl) {
            function setManualAimFromClient(clientX, clientY) {
                if (!peState.enabled || !gameState.active) return;
                let p1 = gameState.players[0];
                if (!p1) return;

                let wx = camera.x + clientX / camera.zoom;
                let wy = camera.y + clientY / camera.zoom;
                peState.manualWorldX = wx;
                peState.manualWorldY = wy;
                peState.lastManualAngle = Math.atan2(wy - p1.y, wx - p1.x);
                peState.lastManualTime = Date.now();
            }

            canvasEl.addEventListener('touchstart', (e) => {
                if (!peState.enabled || !gameState.active) return;
                if (e.cancelable) e.preventDefault();
                if (peState.aimTouchId === null && e.changedTouches.length > 0) {
                    let t = e.changedTouches[0];
                    peState.aimTouchId = t.identifier;
                    peState.isManualAiming = true;
                    setManualAimFromClient(t.clientX, t.clientY);
                }
            }, { passive: false });

            canvasEl.addEventListener('touchmove', (e) => {
                if (!peState.enabled || peState.aimTouchId === null) return;
                if (e.cancelable) e.preventDefault();
                for (let t of e.changedTouches) {
                    if (t.identifier === peState.aimTouchId) {
                        setManualAimFromClient(t.clientX, t.clientY);
                        break;
                    }
                }
            }, { passive: false });

            const endAimTouch = (e) => {
                if (peState.aimTouchId === null) return;
                for (let t of e.changedTouches) {
                    if (t.identifier === peState.aimTouchId) {
                        peState.aimTouchId = null;
                        peState.isManualAiming = false;
                        break;
                    }
                }
            };
            window.addEventListener('touchend', endAimTouch);
            window.addEventListener('touchcancel', endAimTouch);

            // Hỗ trợ click giữ trên canvas bằng chuột khi test PE trên PC
            canvasEl.addEventListener('mousedown', (e) => {
                if (!peState.enabled || !gameState.active || e.button !== 0) return;
                peState.isManualAiming = true;
                setManualAimFromClient(e.clientX, e.clientY);
            });
            window.addEventListener('mousemove', (e) => {
                if (!peState.enabled || !peState.isManualAiming) return;
                setManualAimFromClient(e.clientX, e.clientY);
            });
            window.addEventListener('mouseup', (e) => {
                if (e.button === 0) peState.isManualAiming = false;
            });
        }
    }

    // ======================================================================
    // CHUYỂN ĐỔI GIỮA CHẾ ĐỘ PC & PE
    // ======================================================================
    function updateViewportMeta(isPE) {
        let meta = document.querySelector('meta[name="viewport"]');
        if (!meta) return;
        if (isPE) {
            meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        } else {
            meta.setAttribute('content', 'width=device-width, initial-scale=1.0');
        }
    }

    function setPEMode(enable) {
        peState.enabled = !!enable;
        document.body.classList.toggle('pe-mode', peState.enabled);
        updateViewportMeta(peState.enabled);

        const btnPC = document.getElementById('btnModePC');
        const btnPE = document.getElementById('btnModePE');
        if (btnPC) btnPC.classList.toggle('active', !peState.enabled);
        if (btnPE) btnPE.classList.toggle('active', peState.enabled);

        if (peState.enabled) {
            // Chuyển vào trận với 1 người chơi duy nhất nếu đang ở trong trận
            if (window.gameState && gameState.active && gameState.players.length > 1) {
                gameState.players = [gameState.players[0]];
            }
            if (window.gameState && gameState.active) {
                document.body.classList.add('pe-ingame');
            }
        } else {
            peState.manualFreeze = false;
            peState.joyX = 0;
            peState.joyY = 0;
            peState.isManualAiming = false;
            document.body.classList.remove('pe-ingame');
            const freezeBtn = document.getElementById('peFreezeBtn');
            if (freezeBtn) {
                freezeBtn.classList.remove('frozen');
                freezeBtn.innerText = '❄️ Đóng Băng';
            }
        }
    }
    window.setPEMode = setPEMode;

    // ======================================================================
    // HOOK CAMERA, VÒNG LẶP UPDATE, VẼ THANH HP/MANA TRÊN ĐẦU & CÁC MODAL
    // ======================================================================
    function installPEHooks() {
        // 1. Hook Camera Update để dùng góc nhìn PE tự chỉnh
        if (typeof camera !== 'undefined' && typeof camera.update === 'function') {
            const origCameraUpdate = camera.update.bind(camera);
            camera.update = function () {
                if (!peState.enabled) {
                    return origCameraUpdate();
                }

                let p1 = gameState.players && gameState.players[0];
                if (!p1) return;

                this.targetZoom = peState.cameraZoom;
                this.zoom += (this.targetZoom - this.zoom) * 0.18;

                let viewW = canvas.width / this.zoom;
                let viewH = canvas.height / this.zoom;
                let targetX = p1.x - viewW / 2;
                let targetY = p1.y - viewH / 2;

                this.x += (targetX - this.x) * 0.16;
                this.y += (targetY - this.y) * 0.16;

                this.x = Math.max(0, Math.min(Math.max(0, WORLD_WIDTH - viewW), this.x));
                this.y = Math.max(0, Math.min(Math.max(0, WORLD_HEIGHT - viewH), this.y));
            };
        }

        // 2. Hook initSurvivalMatch (Chế độ PE chỉ tạo 1 người chơi duy nhất)
        if (typeof window.initSurvivalMatch === 'function') {
            const origInitMatch = window.initSurvivalMatch;
            window.initSurvivalMatch = function () {
                const res = origInitMatch.apply(this, arguments);

                if (peState.enabled) {
                    document.body.classList.add('pe-ingame');
                    peState.manualFreeze = false;
                    peState.joyX = 0;
                    peState.joyY = 0;
                    peState.isManualAiming = false;

                    if (gameState.players && gameState.players.length > 1) {
                        gameState.players = [gameState.players[0]];
                    }
                    let p1 = gameState.players[0];
                    if (p1) {
                        p1.isResting = false;
                        camera.zoom = peState.cameraZoom;
                        camera.targetZoom = peState.cameraZoom;
                        camera.x = Math.max(0, p1.x - (canvas.width / 2) / camera.zoom);
                        camera.y = Math.max(0, p1.y - (canvas.height / 2) / camera.zoom);
                    }
                    const freezeBtn = document.getElementById('peFreezeBtn');
                    if (freezeBtn) {
                        freezeBtn.classList.remove('frozen');
                        freezeBtn.innerText = '❄️ Đóng Băng';
                    }
                } else {
                    document.body.classList.remove('pe-ingame');
                }
                return res;
            };
        }

        // 3. Hook renderShopModal để hiện tên đồ trên ô túi đồ ở PE
        if (typeof window.renderShopModal === 'function') {
            const origRenderShop = window.renderShopModal;
            window.renderShopModal = function () {
                const res = origRenderShop.apply(this, arguments);
                if (peState.enabled && gameState.activeShopPlayer) {
                    let p = gameState.players[gameState.activeShopPlayer - 1];
                    let invRow = document.getElementById('shopInvSlots');
                    if (p && invRow) {
                        let slots = invRow.querySelectorAll('.inv-slot');
                        slots.forEach((slot, idx) => {
                            let itemId = p.inventory[idx];
                            if (itemId && ITEMS_DATABASE[itemId]) {
                                let tag = document.createElement('span');
                                tag.className = 'pe-inv-name-tag';
                                tag.innerText = ITEMS_DATABASE[itemId].name;
                                slot.appendChild(tag);
                            }
                        });
                    }
                }
                return res;
            };
        }

        // 4. Hook actionPracticeLevelUp để cộng pendingLevelUps chuẩn cho PE tự mở bảng chọn thẻ
        if (typeof window.actionPracticeLevelUp === 'function') {
            const origPracLv = window.actionPracticeLevelUp;
            window.actionPracticeLevelUp = function () {
                let p1 = gameState && gameState.players ? gameState.players[0] : null;
                let prevPending = p1 ? (p1.pendingLevelUps || 0) : 0;
                const res = origPracLv.apply(this, arguments);
                if (peState.enabled && p1 && (p1.pendingLevelUps || 0) === prevPending) {
                    p1.pendingLevelUps = prevPending + 1;
                }
                return res;
            };
        }

        // 5. Hook update(dt) - Đóng băng khi mở Shop / Lên cấp / Bấm nút Đóng Băng + Điều khiển Joystick & Auto/Manual Attack
        if (typeof window.update === 'function') {
            const origUpdate = window.update;
            window.update = function (dt) {
                if (!peState.enabled) {
                    return origUpdate.apply(this, arguments);
                }

                document.body.classList.toggle('pe-ingame', !!gameState.active);

                let p1 = gameState.players[0];
                let cardModal = document.getElementById('cardModal');
                let shopModal = document.getElementById('shopModal');
                let isCardOpen = cardModal && cardModal.style.display === 'flex';
                let isShopOpen = shopModal && shopModal.style.display === 'flex';

                // Tự động mở khung chọn nâng cấp khi lên cấp ở PE (và đóng băng game)
                if (p1 && !p1.dead && p1.pendingLevelUps > 0 && !isCardOpen && !isShopOpen) {
                    if (typeof window.openCardSelect === 'function') {
                        window.openCardSelect(1);
                        isCardOpen = cardModal && cardModal.style.display === 'flex';
                    }
                }

                // Kiểm tra đóng băng toàn bộ game
                let isFrozen = peState.manualFreeze || isCardOpen || isShopOpen;
                const freezeBanner = document.getElementById('peFreezeBanner');
                if (freezeBanner) {
                    freezeBanner.style.display = (peState.manualFreeze && !isCardOpen && !isShopOpen) ? 'block' : 'none';
                }

                if (isFrozen) {
                    camera.update();
                    if (typeof window.syncHUD === 'function') window.syncHUD();
                    syncPEHud(p1);
                    return;
                }

                // Tránh click chuột vào HUD PE bị main.js hiểu là bắn theo chuột PC
                gameState.mouse.isDown = false;

                // Xử lý di chuyển bằng Joystick tròn
                if (p1 && !p1.dead && !p1.isResting && p1.stunTimer <= 0 && !p1.isDashing) {
                    let jLen = Math.hypot(peState.joyX, peState.joyY);
                    if (jLen > 0.08) {
                        let spd = p1.getActualSpeed();
                        let nx = peState.joyX / Math.max(1, jLen);
                        let ny = peState.joyY / Math.max(1, jLen);
                        // Nếu kéo nhẹ thì đi theo tỉ lệ, kéo hết cỡ đi full tốc
                        let strength = Math.min(1, jLen);
                        p1.x += nx * spd * strength;
                        p1.y += ny * spd * strength;
                        p1.x = Math.max(20, Math.min(WORLD_WIDTH - 20, p1.x));
                        p1.y = Math.max(20, Math.min(WORLD_HEIGHT - 20, p1.y));
                        p1.facingLeft = (nx < 0);

                        if (window.mapProps && typeof window.mapProps.resolveEntityCollision === 'function') {
                            window.mapProps.resolveEntityCollision(p1);
                        }
                    }

                    // Cập nhật hướng nhìn & Đánh thường (Auto ON vs OFF)
                    let desiredAngle = p1.angle;
                    let atkRange = getHeroAttackRange(p1);

                    if (peState.autoAttack) {
                        let nearest = getClosestEnemy(p1);
                        if (nearest && Math.hypot(nearest.x - p1.x, nearest.y - p1.y) <= atkRange + nearest.radius) {
                            desiredAngle = Math.atan2(nearest.y - p1.y, nearest.x - p1.x);
                            gameState.mouse.worldX = nearest.x;
                            gameState.mouse.worldY = nearest.y;
                            p1.castBasicAttack(desiredAngle);
                        } else {
                            if (jLen > 0.08) {
                                desiredAngle = Math.atan2(peState.joyY, peState.joyX);
                            }
                            gameState.mouse.worldX = p1.x + Math.cos(desiredAngle) * 200;
                            gameState.mouse.worldY = p1.y + Math.sin(desiredAngle) * 200;
                        }
                    } else {
                        // Auto OFF: Chạm về hướng nào đó để hero tìm mục tiêu tại hướng đó và đánh
                        if (peState.isManualAiming) {
                            let found = findTargetInDirection(p1, peState.manualWorldX, peState.manualWorldY, atkRange + 80);
                            if (found) {
                                desiredAngle = Math.atan2(found.y - p1.y, found.x - p1.x);
                                gameState.mouse.worldX = found.x;
                                gameState.mouse.worldY = found.y;
                            } else {
                                desiredAngle = Math.atan2(peState.manualWorldY - p1.y, peState.manualWorldX - p1.x);
                                gameState.mouse.worldX = peState.manualWorldX;
                                gameState.mouse.worldY = peState.manualWorldY;
                            }
                            p1.castBasicAttack(desiredAngle);
                        } else if (p1.heroType === 'magadot' && p1.isLevitating) {
                            // Nếu Magadot đang bay chiêu 3 cung, cập nhật mục tiêu theo hướng cuối
                            gameState.mouse.worldX = peState.manualWorldX || (p1.x + Math.cos(p1.angle) * 250);
                            gameState.mouse.worldY = peState.manualWorldY || (p1.y + Math.sin(p1.angle) * 250);
                        } else if (jLen > 0.08) {
                            desiredAngle = Math.atan2(peState.joyY, peState.joyX);
                            gameState.mouse.worldX = p1.x + Math.cos(desiredAngle) * 200;
                            gameState.mouse.worldY = p1.y + Math.sin(desiredAngle) * 200;
                        }
                    }
                }

                origUpdate.apply(this, arguments);
                syncPEHud(p1);
            };
        }

        // 6. Hook draw() - Vẽ thanh HP & Mana trên đầu người chơi + vòng chỉ hướng khi Auto OFF
        if (typeof window.draw === 'function') {
            const origDraw = window.draw;
            window.draw = function () {
                origDraw.apply(this, arguments);
                if (!peState.enabled || !gameState.active) return;

                let p1 = gameState.players && gameState.players[0];
                if (!p1 || p1.dead) return;

                ctx.save();
                ctx.scale(camera.zoom, camera.zoom);
                ctx.translate(-camera.x, -camera.y);

                // Vẽ thanh HP / Giáp ảo & Mana trên đầu Player 1
                drawPEOverheadBars(ctx, p1);

                // Vẽ chỉ báo hướng nhắm khi Auto OFF đang chạm
                if (!peState.autoAttack && peState.isManualAiming) {
                    let found = findTargetInDirection(p1, peState.manualWorldX, peState.manualWorldY, getHeroAttackRange(p1) + 80);
                    let tx = found ? found.x : peState.manualWorldX;
                    let ty = found ? found.y : peState.manualWorldY;

                    ctx.save();
                    ctx.beginPath();
                    ctx.setLineDash([6, 6]);
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(tx, ty);
                    ctx.strokeStyle = found ? 'rgba(255, 71, 87, 0.75)' : 'rgba(0, 229, 255, 0.55)';
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    ctx.setLineDash([]);
                    ctx.beginPath();
                    ctx.arc(tx, ty, found ? (found.radius + 8) : 14, 0, Math.PI * 2);
                    ctx.strokeStyle = found ? '#ff4757' : '#00e5ff';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.restore();
                }

                ctx.restore();
            };
        }
    }

    function drawPEOverheadBars(ctx, p) {
        let liftY = (p.levitateHeight || 0);
        let extraOffset = 34;
        if (p.heroType === 'yumakai' && p.passivePoints > 0) extraOffset = 54;
        else if (p.heroType === 'rivent' || p.heroType === 'wirdor' || p.heroType === 'gorox') extraOffset = 38;

        let barW = 58;
        let hpH = 7;
        let mpH = p.stats.maxMana > 0 ? 4 : 0;
        let barX = p.x - barW / 2;
        let barY = p.y - liftY - p.radius - extraOffset;

        ctx.save();
        // Khung nền
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(barX - 1, barY - 1, barW + 2, hpH + mpH + (mpH > 0 ? 3 : 2));

        // Thanh HP
        let hpRatio = Math.max(0, Math.min(1, p.stats.hp / Math.max(1, p.stats.maxHp)));
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(barX, barY, barW * hpRatio, hpH);

        // Thanh Giáp ảo (Shield) màu trắng
        if (p.shield && p.shield > 0) {
            let shieldRatio = Math.min(1, p.shield / Math.max(1, p.stats.maxHp));
            ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
            ctx.fillRect(barX, barY, barW * shieldRatio, hpH);
        }

        // Thanh Mana (nếu tướng dùng mana)
        if (mpH > 0) {
            let mpRatio = Math.max(0, Math.min(1, p.stats.mana / Math.max(1, p.stats.maxMana)));
            ctx.fillStyle = '#2980b9';
            ctx.fillRect(barX, barY + hpH + 1, barW * mpRatio, mpH);
        }

        // Hiển thị số HP gọn phía trên thanh
        ctx.font = 'bold 9px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 3;
        ctx.fillText(`${Math.round(p.stats.hp)}`, p.x, barY - 3);
        ctx.restore();
    }

    function syncPEHud(p1) {
        if (!peState.enabled || !p1) return;

        const goldEl = document.getElementById('peGoldText');
        const lvEl = document.getElementById('peLvText');
        const dotEl = document.getElementById('peLvDot');
        if (goldEl) goldEl.innerText = Math.floor(p1.gold);
        if (lvEl) lvEl.innerText = p1.level;
        if (dotEl) dotEl.style.display = p1.pendingLevelUps > 0 ? 'block' : 'none';

        // Cập nhật 3 nút chiêu
        for (let i = 1; i <= 3; i++) {
            const btn = document.getElementById(`peSkill${i}Btn`);
            const cdFill = document.getElementById(`peSkill${i}Cd`);
            const cdNum = document.getElementById(`peSkill${i}CdNum`);
            if (!btn || !cdFill || !cdNum) continue;

            let cd = Math.max(0, p1.cooldowns[i] || 0);
            let maxCd = Math.max(0.1, p1.maxCooldowns[i] || 1);
            let pct = Math.min(100, (cd / maxCd) * 100);
            cdFill.style.height = `${pct}%`;

            if (cd > 0.05) {
                cdNum.style.display = 'block';
                cdNum.innerText = cd >= 1 ? Math.ceil(cd) : cd.toFixed(1);
            } else {
                cdNum.style.display = 'none';
            }

            let manaCost = (p1.manaCosts && p1.manaCosts[i]) || 0;
            btn.classList.toggle('no-mana', manaCost > 0 && p1.stats.mana < manaCost);
        }

        // Hiện nút đổi vũ khí khi Magadot đứng cạnh rương
        const chestBtn = document.getElementById('peChestBtn');
        if (chestBtn) {
            let showChest = false;
            if (p1.heroType === 'magadot' && window.mapProps && window.mapProps.props) {
                showChest = window.mapProps.props.some(pr => pr.def.isChest && !pr.dead && Math.hypot(pr.x - p1.x, pr.y - p1.y) <= 85);
            }
            chestBtn.style.display = showChest ? 'flex' : 'none';
        }
    }

    // Khởi tạo khi DOM sẵn sàng
    function bootstrapPE() {
        injectPEStyles();
        createPEDomElements();
        installPEHooks();
        setPEMode(false); // Mặc định PC
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrapPE);
    } else {
        bootstrapPE();
    }
})();