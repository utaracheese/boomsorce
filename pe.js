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
        aimTouchId: null,
        isManualAiming: false,
        manualWorldX: 0,
        manualWorldY: 0,
        lastManualAngle: 0,
        lastManualTime: 0,
        selectedTarget: null,    // Quái được người chơi chọn khi AUTO: OFF
        autoTarget: null,        // Quái gần nhất được tự động chọn khi AUTO: ON
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
            case 'taking': return 145;
            case 'magadot': return (p.currentWeapon === 'bow' || p.weapon === 'bow') ? 460 : 115;
            default: return 450;
        }
    }

    function getValidEnemies() {
        if (typeof gameState === 'undefined' || !Array.isArray(gameState.enemies)) return [];
        return gameState.enemies.filter(e => e && !e.dead && !(e.monsterType === 'dummy' && e.isInvisible));
    }

    function isTargetValid(target) {
        if (!target || target.dead) return false;
        if (target.monsterType === 'dummy' && target.isInvisible) return false;
        if (typeof gameState === 'undefined' || !Array.isArray(gameState.enemies)) return false;
        return gameState.enemies.includes(target);
    }

    function getClosestEnemy(p) {
        if (!p) return null;
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

    // Chọn mục tiêu khi người chơi chạm lên màn hình ở chế độ AUTO: OFF
    function selectTargetAtWorldPos(wx, wy) {
        let list = getValidEnemies();
        let zoom = (typeof camera !== 'undefined' && camera.zoom) ? camera.zoom : 1;
        let pickPadding = Math.max(40, 55 / zoom);

        let best = null;
        let bestScore = Infinity;

        for (let e of list) {
            let dist = Math.hypot(e.x - wx, e.y - wy);
            if (dist <= e.radius + pickPadding) {
                let score = dist - e.radius;
                if (score < bestScore) {
                    bestScore = score;
                    best = e;
                }
            }
        }

        peState.selectedTarget = best;
        return best;
    }

    function syncMouseToWorld(wx, wy) {
        if (typeof gameState === 'undefined') return;
        gameState.mouse.worldX = wx;
        gameState.mouse.worldY = wy;
        if (typeof camera !== 'undefined') {
            gameState.mouse.x = (wx - camera.x) * camera.zoom;
            gameState.mouse.y = (wy - camera.y) * camera.zoom;
        }
    }

    function computeSkillAim(p) {
        if (!p) return 0;

        if (peState.autoAttack) {
            let nearest = getClosestEnemy(p);
            peState.autoTarget = nearest;
            if (nearest) {
                syncMouseToWorld(nearest.x, nearest.y);
                return Math.atan2(nearest.y - p.y, nearest.x - p.x);
            }
            let fx = p.x + Math.cos(p.angle) * 260;
            let fy = p.y + Math.sin(p.angle) * 260;
            syncMouseToWorld(fx, fy);
            return p.angle;
        } else {
            // AUTO: OFF -> Chiêu ngắm thẳng vào quái đang được chọn làm mục tiêu
            if (isTargetValid(peState.selectedTarget)) {
                let target = peState.selectedTarget;
                syncMouseToWorld(target.x, target.y);
                return Math.atan2(target.y - p.y, target.x - p.x);
            }
            peState.selectedTarget = null;

            if (Date.now() - peState.lastManualTime < 4000) {
                syncMouseToWorld(peState.manualWorldX, peState.manualWorldY);
                return Math.atan2(peState.manualWorldY - p.y, peState.manualWorldX - p.x);
            }
            let fx = p.x + Math.cos(p.angle) * 260;
            let fy = p.y + Math.sin(p.angle) * 260;
            syncMouseToWorld(fx, fy);
            return p.angle;
        }
    }

    // ======================================================================
    // TIÊM CSS GIAO DIỆN PE
    // ======================================================================
    function injectPEStyles() {
        if (document.getElementById('peDynamicStyle')) return;
        const style = document.createElement('style');
        style.id = 'peDynamicStyle';
        style.textContent = `
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

            body:not(.pe-mode) #p2StatsCorner {
                top: 44px;
            }

            body.pe-mode canvas {
                touch-action: none;
            }

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

            body.pe-mode #p1StatsCorner,
            body.pe-mode #p2StatsCorner,
            body.pe-mode #hudP1,
            body.pe-mode #hudP2 {
                display: none !important;
            }

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
    // TẠO GIAO DIỆN DOM CHO PE
    // ======================================================================
    function createPEDomElements() {
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

        document.getElementById('peShopBtn').addEventListener('click', (e) => {
            stop(e);
            if (typeof window.toggleShop === 'function') window.toggleShop(1);
        });

        document.getElementById('peLvBadge').addEventListener('click', (e) => {
            stop(e);
            if (typeof window.openCardSelect === 'function') window.openCardSelect(1);
        });

        const freezeBtn = document.getElementById('peFreezeBtn');
        freezeBtn.addEventListener('click', (e) => {
            stop(e);
            peState.manualFreeze = !peState.manualFreeze;
            freezeBtn.classList.toggle('frozen', peState.manualFreeze);
            freezeBtn.innerText = peState.manualFreeze ? '▶️ Tiếp Tục' : '❄️ Đóng Băng';
        });

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

        const autoBtn = document.getElementById('peAutoAttackBtn');
        autoBtn.addEventListener('click', (e) => {
            stop(e);
            peState.autoAttack = !peState.autoAttack;
            peState.selectedTarget = null;
            peState.autoTarget = null;
            autoBtn.classList.toggle('off', !peState.autoAttack);
            autoBtn.innerText = peState.autoAttack ? '⚔️ AUTO: ON' : '🎯 AUTO: OFF';
        });

        document.getElementById('peChestBtn').addEventListener('click', (e) => {
            stop(e);
            let p1 = (typeof gameState !== 'undefined' && gameState.players) ? gameState.players[0] : null;
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
                if (!peState.enabled || typeof gameState === 'undefined' || !gameState.active) return;

                let p1 = gameState.players[0];
                if (!p1 || p1.dead || peState.manualFreeze) return;

                btn.classList.add('pressed');
                setTimeout(() => btn.classList.remove('pressed'), 120);

                let aim = computeSkillAim(p1);
                p1.angle = aim;
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

        // Joystick tròn
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

        // Chạm lên màn hình Canvas để chọn mục tiêu (khi AUTO: OFF)
        const canvasEl = document.getElementById('gameCanvas');
        if (canvasEl) {
            function setManualAimFromClient(clientX, clientY, isInitialTap) {
                if (!peState.enabled || typeof gameState === 'undefined' || !gameState.active) return;
                let p1 = gameState.players[0];
                if (!p1) return;

                let rect = canvasEl.getBoundingClientRect();
                let wx = camera.x + (clientX - rect.left) / camera.zoom;
                let wy = camera.y + (clientY - rect.top) / camera.zoom;
                peState.manualWorldX = wx;
                peState.manualWorldY = wy;
                peState.lastManualAngle = Math.atan2(wy - p1.y, wx - p1.x);
                peState.lastManualTime = Date.now();

                if (isInitialTap && !peState.autoAttack) {
                    selectTargetAtWorldPos(wx, wy);
                }
            }

            canvasEl.addEventListener('touchstart', (e) => {
                if (!peState.enabled || typeof gameState === 'undefined' || !gameState.active) return;
                if (e.cancelable) e.preventDefault();
                if (peState.aimTouchId === null && e.changedTouches.length > 0) {
                    let t = e.changedTouches[0];
                    peState.aimTouchId = t.identifier;
                    peState.isManualAiming = true;
                    setManualAimFromClient(t.clientX, t.clientY, true);
                }
            }, { passive: false });

            canvasEl.addEventListener('touchmove', (e) => {
                if (!peState.enabled || peState.aimTouchId === null) return;
                if (e.cancelable) e.preventDefault();
                for (let t of e.changedTouches) {
                    if (t.identifier === peState.aimTouchId) {
                        setManualAimFromClient(t.clientX, t.clientY, false);
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

            canvasEl.addEventListener('mousedown', (e) => {
                if (!peState.enabled || typeof gameState === 'undefined' || !gameState.active || e.button !== 0) return;
                peState.isManualAiming = true;
                setManualAimFromClient(e.clientX, e.clientY, true);
            });
            window.addEventListener('mousemove', (e) => {
                if (!peState.enabled || !peState.isManualAiming) return;
                setManualAimFromClient(e.clientX, e.clientY, false);
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

        const hasGS = (typeof gameState !== 'undefined');
        if (peState.enabled) {
            if (hasGS && gameState.active && gameState.players.length > 1) {
                gameState.players = [gameState.players[0]];
            }
            if (hasGS && gameState.active) {
                document.body.classList.add('pe-ingame');
            }
        } else {
            peState.manualFreeze = false;
            peState.joyX = 0;
            peState.joyY = 0;
            peState.isManualAiming = false;
            peState.selectedTarget = null;
            peState.autoTarget = null;
            if (hasGS) gameState.mouse.isDown = false;
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
    // HOOK CAMERA, VÒNG LẶP UPDATE, VẼ HUD & KHÓA MỤC TIÊU
    // ======================================================================
    function installPEHooks() {
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
                    peState.selectedTarget = null;
                    peState.autoTarget = null;

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

        if (typeof window.actionPracticeLevelUp === 'function') {
            const origPracLv = window.actionPracticeLevelUp;
            window.actionPracticeLevelUp = function () {
                let p1 = (typeof gameState !== 'undefined' && gameState.players) ? gameState.players[0] : null;
                let prevPending = p1 ? (p1.pendingLevelUps || 0) : 0;
                const res = origPracLv.apply(this, arguments);
                if (peState.enabled && p1 && (p1.pendingLevelUps || 0) === prevPending) {
                    p1.pendingLevelUps = prevPending + 1;
                }
                return res;
            };
        }

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

                if (p1 && !p1.dead && p1.pendingLevelUps > 0 && !isCardOpen && !isShopOpen) {
                    if (typeof window.openCardSelect === 'function') {
                        window.openCardSelect(1);
                        isCardOpen = cardModal && cardModal.style.display === 'flex';
                    }
                }

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

                let aimWorldX = p1 ? p1.x + Math.cos(p1.angle) * 200 : 0;
                let aimWorldY = p1 ? p1.y + Math.sin(p1.angle) * 200 : 0;
                let shouldAttack = false;
                let activeTarget = null;

                if (p1 && !p1.dead && !p1.isResting && p1.stunTimer <= 0 && !p1.isDashing) {
                    let jLen = Math.hypot(peState.joyX, peState.joyY);
                    if (jLen > 0.08) {
                        let spd = p1.getActualSpeed();
                        let nx = peState.joyX / Math.max(1, jLen);
                        let ny = peState.joyY / Math.max(1, jLen);
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

                    let atkRange = getHeroAttackRange(p1);

                    if (peState.autoAttack) {
                        peState.autoTarget = getClosestEnemy(p1);
                        activeTarget = peState.autoTarget;
                    } else {
                        if (!isTargetValid(peState.selectedTarget)) {
                            peState.selectedTarget = null;
                        }
                        peState.autoTarget = null;
                        activeTarget = peState.selectedTarget;
                    }

                    let inRange = activeTarget && (Math.hypot(activeTarget.x - p1.x, activeTarget.y - p1.y) <= atkRange + activeTarget.radius);
                    if (inRange) {
                        shouldAttack = true;
                        aimWorldX = activeTarget.x;
                        aimWorldY = activeTarget.y;
                        p1.facingLeft = (aimWorldX < p1.x);
                    } else if (jLen > 0.08) {
                        aimWorldX = p1.x + peState.joyX * 200;
                        aimWorldY = p1.y + peState.joyY * 200;
                    } else if (activeTarget) {
                        aimWorldX = activeTarget.x;
                        aimWorldY = activeTarget.y;
                        p1.facingLeft = (aimWorldX < p1.x);
                    }

                    syncMouseToWorld(aimWorldX, aimWorldY);
                    gameState.mouse.isDown = shouldAttack;
                } else {
                    gameState.mouse.isDown = false;
                }

                origUpdate.apply(this, arguments);

                gameState.mouse.isDown = false;
                if (p1 && !p1.dead) {
                    syncMouseToWorld(aimWorldX, aimWorldY);
                    p1.angle = Math.atan2(aimWorldY - p1.y, aimWorldX - p1.x);
                }

                syncPEHud(p1);
            };
        }

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

                drawPEOverheadBars(ctx, p1);

                if (peState.autoAttack && isTargetValid(peState.autoTarget)) {
                    drawPETargetLock(ctx, peState.autoTarget, '#00e5ff', true);
                } else if (!peState.autoAttack && isTargetValid(peState.selectedTarget)) {
                    drawPETargetLock(ctx, peState.selectedTarget, '#ff3838', false);
                }

                ctx.restore();
            };
        }
    }

    function drawPETargetLock(ctx, target, color, isDashed) {
        let r = target.radius + 9;
        ctx.save();
        ctx.translate(target.x, target.y);

        ctx.beginPath();
        if (isDashed) ctx.setLineDash([6, 5]);
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = isDashed ? 2 : 2.5;
        ctx.stroke();

        if (!isDashed) {
            ctx.setLineDash([]);
            let tick = 7;
            ctx.beginPath();
            ctx.moveTo(-r - 4, 0); ctx.lineTo(-r + tick, 0);
            ctx.moveTo(r + 4, 0); ctx.lineTo(r - tick, 0);
            ctx.moveTo(0, -r - 4); ctx.lineTo(0, -r + tick);
            ctx.moveTo(0, r + 4); ctx.lineTo(0, r - tick);
            ctx.strokeStyle = '#ffeb3b';
            ctx.lineWidth = 2.5;
            ctx.stroke();
        }
        ctx.restore();
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
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(barX - 1, barY - 1, barW + 2, hpH + mpH + (mpH > 0 ? 3 : 2));

        let hpRatio = Math.max(0, Math.min(1, p.stats.hp / Math.max(1, p.stats.maxHp)));
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(barX, barY, barW * hpRatio, hpH);

        if (p.shield && p.shield > 0) {
            let shieldRatio = Math.min(1, p.shield / Math.max(1, p.stats.maxHp));
            ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
            ctx.fillRect(barX, barY, barW * shieldRatio, hpH);
        }

        if (mpH > 0) {
            let mpRatio = Math.max(0, Math.min(1, p.stats.mana / Math.max(1, p.stats.maxMana)));
            ctx.fillStyle = '#2980b9';
            ctx.fillRect(barX, barY + hpH + 1, barW * mpRatio, mpH);
        }

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

        const chestBtn = document.getElementById('peChestBtn');
        if (chestBtn) {
            let showChest = false;
            if (p1.heroType === 'magadot' && window.mapProps && window.mapProps.props) {
                showChest = window.mapProps.props.some(pr => pr.def.isChest && !pr.dead && Math.hypot(pr.x - p1.x, pr.y - p1.y) <= 85);
            }
            chestBtn.style.display = showChest ? 'flex' : 'none';
        }
    }

    function bootstrapPE() {
        injectPEStyles();
        createPEDomElements();
        installPEHooks();
        setPEMode(false);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrapPE);
    } else {
        bootstrapPE();
    }
})();