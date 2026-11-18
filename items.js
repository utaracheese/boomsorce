/* ==========================================================================
   BẢNG QUY ĐỔI GIÁ TRỊ VÀNG / CHỈ SỐ CƠ BẢN VÀ DANH MỤC TRANG BỊ
   ========================================================================== */

function getItemIcon(itemOrId) {
    if (!itemOrId) return '';
    let it = typeof itemOrId === 'string' ? ITEMS_DATABASE[itemOrId] : itemOrId;
    if (!it) return '';
    if (it.icon) return it.icon;
    return `assets/item/${it.id}.png`;
}

const ITEMS_DATABASE = {
    // ==========================================
    // NHÓM CÔNG VẬT LÝ (AD)
    // ==========================================
    'long_kiem': {
        id: 'long_kiem', name: 'Kiếm Dài', category: 'ad',
        cost: 330, icon: 'assets/item/long_kiem.png',
        stats: { ad: 10 }, desc: '+10 Công vật lý', recipe: []
    },
    'short_kiem': {
        id: 'short_kiem', name: 'Kiếm Ngắn', category: 'ad',
        cost: 300, icon: 'assets/item/short_kiem.png',
        stats: { attackSpeedBonus: 0.12 }, desc: '+12% Tốc đánh', recipe: []
    },
    'gan_tay': {
        id: 'gan_tay', name: 'Găng Tay Vải', category: 'ad',
        cost: 400, icon: 'assets/item/gan_tay.png',
        stats: { critRate: 10 }, desc: '+10% Tỉ lệ chí mạng', recipe: []
    },
    'doi_quy': {
        id: 'doi_quy', name: 'Trùy Quỷ', category: 'ad',
        cost: 480, icon: 'assets/item/doi_quy.png',
        stats: { lifesteal: 1 }, desc: '+1% Hút máu vật lý', recipe: []
    },
    'dao_hunt': {
        id: 'dao_hunt', name: 'Dao Thợ Săn', category: 'ad',
        cost: 500, icon: 'assets/item/dao_hunt.png',
        stats: { ad: 8 },
        uniqueStats: { expBonus: 25 },
        uniquePassiveName: 'Săn Rừng',
        desc: '+8 AD\n+25% EXP từ quái\nSăn Rừng (NTDN): Đòn đánh thêm 8 sát thương chuẩn lên quái.',
        recipe: []
    },
    'kiem_hiep_si': {
        id: 'kiem_hiep_si', name: 'Kiếm Hiệp Sĩ', category: 'ad',
        cost: 750, icon: 'assets/item/kiem_hiep_si.png',
        stats: { ad: 24 }, desc: '+24 Công vật lý', recipe: ['long_kiem', 'long_kiem']
    },
    'no_tien': {
        id: 'no_tien', name: 'Nỏ Tiễn', category: 'ad',
        cost: 1850, icon: 'assets/item/no_tien.png',
        uniqueStats: { ad: 14, armorPen: 25, attackSpeedBonus: 0.18, critRate: 12 },
        uniquePassiveName: 'Nỏ tiễn',
        desc: '+14 AD, +25 Xuyên giáp, +18% Tốc đánh, +12% Chí mạng (NTDN)\n(AD chuyển hóa thành Xuyên giáp).',
        recipe: ['kiem_hiep_si', 'short_kiem', 'gan_tay']
    },
    'song_bao_kich': {
        id: 'song_bao_kich', name: 'Song Bạo Kích', category: 'ad',
        cost: 490, icon: 'assets/item/song_bao_kich.png',
        stats: { attackSpeedBonus: 0.20, speed: 0.02 }, desc: '+20% Tốc đánh\n+2 Tốc chạy', recipe: ['short_kiem']
    },
    'phi_tieu': {
        id: 'phi_tieu', name: 'Phi Tiêu', category: 'ad',
        cost: 365, icon: 'assets/item/phi_tieu.png',
        stats: { attackSpeedBonus: 0.15 },
        uniquePassiveName: 'Găm Sâu',
        desc: '+15% Tốc đánh\nGăm Sâu (NTDN): Đòn đánh thêm 2-5 sát thương vật lý lên địch (không chí mạng).',
        recipe: ['short_kiem']
    },
    'kartana': {
        id: 'kartana', name: 'Kartana', category: 'ad',
        cost: 920, icon: 'assets/item/kartana.png',
        stats: { ad: 20 },
        uniqueStats: { expBonus: 35 },
        uniquePassiveName: 'Kartana_Passives',
        desc: '+20 Công vật lý\n+35% EXP từ quái\nSăn Rừng (NTDN): Đòn đánh thêm (8~10 + 10% AD) STC lên quái.\nẤn Diệt Quỷ (NTDN): Mỗi 20 quái hạ gục +1 điểm (tối đa 15). Mỗi điểm tăng 1% tổng AD.',
        recipe: ['dao_hunt', 'long_kiem']
    },
    'doi_quy_pet': {
        id: 'doi_quy_pet', name: 'Dơi Quỷ', category: 'ad',
        cost: 780, icon: 'assets/item/doi_quy_pet.png',
        stats: { lifesteal: 1 },
        uniquePassiveName: 'Dơi Quỷ Triệu Hồi',
        desc: '+1% Hút máu vật lý\nTriệu hồi 1 chú dơi bay quanh chủ. Mỗi 1-3s dơi phóng huyết đạn gây 30 sát thương và hồi máu.',
        recipe: ['doi_quy']
    },
    'truy_bao_thach': {
        id: 'truy_bao_thach', name: 'Trùy Bảo Thạch', category: 'ad',
        cost: 360, icon: 'assets/item/truy_bao_thach.png',
        stats: { attackSpeedBonus: 0.10, maxHp: 70 }, desc: '+10% Tốc đánh\n+70 Máu tối đa', recipe: ['short_kiem']
    },
    'sung_hai_tac': {
        id: 'sung_hai_tac', name: 'Súng Hải Tặc', category: 'ad',
        cost: 2950, icon: 'assets/item/sung_hai_tac.png',
        stats: { ad: 22, armorPen: 45, attackSpeedBonus: 0.25, critRate: 18 },
        uniquePassiveName: 'Siêu tốc đánh thường',
        desc: '+22 AD, +45 Xuyên giáp, +25% Tốc đánh, +18% Chí mạng (NTDN)\nNTDN: Đòn bắn kèm đạn phụ gây (1.5*Lv) + 5% AD.',
        recipe: ['no_tien']
    },
    'phao_cong': {
        id: 'phao_cong', name: 'Pháo Công', category: 'ad',
        cost: 3100, icon: 'assets/item/phao_cong.png',
        stats: { armorPen: 80, attackSpeedBonus: 0.28, critRate: 20 },
        uniquePassiveName: 'Săn lùng',
        uniqueCooldown: 5.0,
        desc: '+80 Xuyên giáp, +28% Tốc đánh, +20% Chí mạng (NTDN)\nSăn lùng (NTDN - CD 5s): Đòn đánh kích nổ phép 7% HP quái.',
        recipe: ['no_tien']
    },
    'thanh_kiem': {
        id: 'thanh_kiem', name: 'Thánh Kiếm', category: 'ad',
        cost: 3250, icon: 'assets/item/thanh_kiem.png',
        stats: { ad: 65, critRate: 25 },
        uniqueStats: { critDamage: 40 },
        uniquePassiveName: 'Thánh kiếm',
        desc: '+65 AD, +25% Chí mạng\nNTDN: +40% Sát thương chí mạng.',
        recipe: ['kiem_hiep_si', 'gan_tay', 'gan_tay']
    },
    'guom_diet_quy': {
        id: 'guom_diet_quy', name: 'Gươm Diệt Quỷ', category: 'ad',
        cost: 2450, icon: 'assets/item/guom_diet_quy.png',
        stats: { ad: 40, cdr: 0.10 },
        uniqueStats: { expBonus: 50 },
        uniquePassiveName: 'Gươm Diệt Quỷ_Passives',
        desc: '+40 Công vật lý, +10% Giảm hồi chiêu\n+50% EXP từ quái\nSăn Rừng (NTDN): Đòn đánh thêm (12~15 + 15% AD) STC lên quái.\nẤn Diệt Quỷ (NTDN): Tích lũy tối đa 30 điểm (+30% tổng AD).',
        recipe: ['kartana']
    },
    'hac_kiem_dracula': {
        id: 'hac_kiem_dracula', name: 'Hắc Kiếm Dracula', category: 'ad',
        cost: 2850, icon: 'assets/item/hac_kiem_dracula.png',
        stats: { ad: 60, lifesteal: 2.5 },
        uniquePassiveName: 'Uống Máu',
        uniqueCooldown: 75.0,
        desc: '+60 Công vật lý, +2.5% Hút máu vật lý\nUống Máu (NTDN - CD 75s): Khi HP xuống dưới 30%, nhận 50% miễn thương và +7.5% hút máu trong 2s.',
        recipe: ['doi_quy', 'short_kiem', 'kiem_hiep_si']
    },
    'sat_chop_kiem': {
        id: 'sat_chop_kiem', name: 'Sát Chớp Kiếm', category: 'ad',
        cost: 1750, icon: 'assets/item/sat_chop_kiem.png',
        stats: { attackSpeedBonus: 0.10, critRate: 15 },
        speedPercentBonus: 0.06,
        uniquePassiveName: 'Bạo Kích Chớp',
        desc: '+10% Tốc đánh, +15% Chí mạng, +6% Tốc chạy\nBạo Kích (NTDN): Đánh trúng địch tăng 15% tốc đánh trong 1.25s, cộng dồn tối đa 5 lần.',
        recipe: ['song_bao_kich', 'gan_tay']
    },
    'chien_kiem_co_dai': {
        id: 'chien_kiem_co_dai', name: 'Chiến Kiếm Cổ Đại', category: 'ad',
        cost: 3250, icon: 'assets/item/chien_kiem_co_dai.png',
        stats: { ad: 170 },
        uniquePassiveName: 'Điểm Yếu',
        desc: '+170 Công vật lý\nĐiểm Yếu (NTDN): Khi quái dưới 50% HP, tăng 30% sát thương gây ra lên quái đó.',
        recipe: ['kiem_hiep_si', 'kiem_hiep_si']
    },
    'phat_to_truong_sinh': {
        id: 'phat_to_truong_sinh', name: 'Phật Tổ Trường Sinh', category: 'ad',
        cost: 2950, icon: 'assets/item/phat_to_truong_sinh.png',
        stats: { ad: 60, maxHp: 150, cdr: 0.10 },
        uniquePassiveName: 'Từ Chối Tử Thần',
        uniqueCooldown: 90.0,
        desc: '+60 Công vật lý, +150 Máu, +10% Giảm hồi chiêu\nTừ Chối Tử Thần (NTDN - CD 90s): Nhận đòn chí tử kích hoạt bất tử 1.5s.',
        recipe: ['kiem_hiep_si', 'truy_bao_thach']
    },
    'loi_than_kiem': {
        id: 'loi_than_kiem', name: 'Lôi Thần Kiếm', category: 'ad',
        cost: 1450, icon: 'assets/item/loi_than_kiem.png',
        stats: { attackSpeedBonus: 0.20, maxHp: 100, cdr: 0.05 },
        uniquePassiveName: 'Chớp Điện',
        desc: '+20% Tốc đánh, +100 Máu, +5% Giảm hồi chiêu\nChớp Điện (NTDN): Đòn đánh thường phóng tia điện giật lan 3-4 kẻ địch lân cận.',
        recipe: ['phi_tieu', 'truy_bao_thach']
    },

    // ==========================================
    // NHÓM CÔNG PHÉP (AP)
    // ==========================================
    'sach_phep': {
        id: 'sach_phep', name: 'Sách Phép', category: 'ap',
        cost: 340, icon: 'assets/item/sach_phep.png',
        stats: { ap: 20 }, desc: '+20 Công phép', recipe: []
    },
    'ngoc_hach': {
        id: 'ngoc_hach', name: 'Ngọc Hạch', category: 'ap',
        cost: 350, icon: 'assets/item/ngoc_hach.png',
        uniqueStats: { cdr: 0.05 },
        uniquePassiveName: 'Ngọc Hạch Cdr',
        desc: '+5% Giảm hồi chiêu (NTDN)', recipe: []
    },
    'ngoc_nuoc': {
        id: 'ngoc_nuoc', name: 'Ngọc Nước', category: 'ap',
        cost: 280, icon: 'assets/item/ngoc_nuoc.png',
        stats: { maxMana: 50 }, desc: '+50 Năng lượng tối đa', recipe: []
    },
    'ngoc_moc': {
        id: 'ngoc_moc', name: 'Ngọc Mộc', category: 'ap',
        cost: 330, icon: 'assets/item/ngoc_moc.png',
        stats: { maxHp: 70, ap: 5 }, desc: '+70 Máu, +5 Công phép', recipe: []
    },
    'da_thuy_trieu': {
        id: 'da_thuy_trieu', name: 'Đá Thủy Triều', category: 'ap',
        cost: 300, icon: 'assets/item/da_thuy_trieu.png',
        stats: { manaRegen: 5.0 }, desc: '+5 Hồi năng lượng/s', recipe: []
    },
    'gang_tay_ma_thuat': {
        id: 'gang_tay_ma_thuat', name: 'Găng Tay Ma Thuật', category: 'ap',
        cost: 500, icon: 'assets/item/gang_tay_ma_thuat.png',
        stats: { ap: 15 },
        uniqueStats: { expBonus: 25 },
        uniquePassiveName: 'Săn Rừng',
        desc: '+15 Công phép\n+25% EXP từ quái (NTDN)\nSăn Rừng (NTDN): Đòn đánh thêm 8 sát thương chuẩn lên quái.',
        recipe: []
    },
    'gay_phu_thuy': {
        id: 'gay_phu_thuy', name: 'Gậy Phù Thủy', category: 'ap',
        cost: 1100, icon: 'assets/item/gay_phu_thuy.png',
        stats: { ap: 68 }, desc: '+68 Công phép', recipe: ['sach_phep', 'sach_phep']
    },
    'truong_ho_mang': {
        id: 'truong_ho_mang', name: 'Trượng Hổ Mang', category: 'ap',
        cost: 950, icon: 'assets/item/truong_ho_mang.png',
        stats: { ap: 50, spellVamp: 1.2 }, desc: '+50 Công phép\n+1.2% Hút máu phép',
        recipe: ['sach_phep', 'sach_phep']
    },
    'loa_phong_thanh': {
        id: 'loa_phong_thanh', name: 'Loa Phóng Thanh', category: 'ap',
        cost: 1250, icon: 'assets/item/loa_phong_thanh.png',
        stats: { ap: 90 },
        uniquePassiveName: 'Vang Vọng Sơ',
        uniqueCooldown: 5.0,
        desc: '+90 Công phép\nVang Vọng (NTDN - CD 5s): Dùng chiêu trúng địch tạo vụ nổ nhỏ gây 20-70 Công phép.',
        recipe: ['sach_phep', 'sach_phep']
    },
    'dao_phep_thuat': {
        id: 'dao_phep_thuat', name: 'Dao Phép Thuật', category: 'ap',
        cost: 1050, icon: 'assets/item/dao_phep_thuat.png',
        stats: { ap: 50 },
        uniqueStats: { expBonus: 35 },
        uniquePassiveName: 'DaoPhép_Passives',
        desc: '+50 Công phép\n+35% EXP từ quái (NTDN)\nSăn Rừng (NTDN): Hạ gục quái giảm 0.5s hồi 3 chiêu (CD 5s).\nẤn Diệt Quỷ (NTDN): Mỗi 20 quái hạ gục +1 điểm (tối đa 15). Mỗi điểm tăng 1% tổng AP.',
        recipe: ['gang_tay_ma_thuat', 'sach_phep']
    },
    'gay_chu_thuat': {
        id: 'gay_chu_thuat', name: 'Gậy Chú Thuật', category: 'ap',
        cost: 980, icon: 'assets/item/gay_chu_thuat.png',
        stats: { ap: 50 },
        uniquePassiveName: 'Ma Chú',
        uniqueCooldown: 3.0,
        desc: '+50 Công phép\nMa Chú (NTDN - CD 3s): Sau khi dùng chiêu, đòn đánh thường tiếp theo gây thêm 30-120 sát thương phép.',
        recipe: ['sach_phep', 'sach_phep']
    },
    'gang_tay_anh_hung': {
        id: 'gang_tay_anh_hung', name: 'Găng Tay Anh Hùng', category: 'ap',
        cost: 950, icon: 'assets/item/gang_tay_anh_hung.png',
        stats: { ap: 25 },
        uniquePassiveName: 'Phần Thưởng Anh Hùng',
        desc: '+25 Công phép\nPhần Thưởng Anh Hùng (NTDN): Khi lên cấp lập tức hồi 20% HP và 20% Mana đã mất (tối đa 15 lần).',
        recipe: ['sach_phep', 'da_thuy_trieu', 'ngoc_moc']
    },
    'truong_mau': {
        id: 'truong_mau', name: 'Trượng Máu', category: 'ap',
        cost: 3100, icon: 'assets/item/truong_mau.png',
        stats: { ap: 130, spellVamp: 3.0, maxHp: 200 },
        uniquePassiveName: 'Hút Linh Lực',
        desc: '+130 Công phép, +3% Hút máu phép, +200 Máu\nHút Linh Lực (NTDN): Mỗi 5% HP kẻ địch bị mất giúp hồi ngay 1% Mana tối đa.',
        recipe: ['truong_ho_mang', 'truong_ho_mang', 'gay_phu_thuy', 'ngoc_moc']
    },
    'hoa_thach_am': {
        id: 'hoa_thach_am', name: 'Hỏa Thạch Âm', category: 'ap',
        cost: 2950, icon: 'assets/item/hoa_thach_am.png',
        stats: { ap: 190 },
        speedPercentBonus: 0.03,
        uniquePassiveName: 'Vang Vọng Cao',
        uniqueCooldown: 4.5,
        desc: '+190 Công phép, +3% Tốc chạy\nVang Vọng (NTDN - CD 4.5s): Dùng chiêu trúng địch tạo vụ nổ gây 50 + 20% AP sát thương phép.',
        recipe: ['loa_phong_thanh', 'gay_phu_thuy']
    },
    'kiem_thap_tu': {
        id: 'kiem_thap_tu', name: 'Kiếm Thập Tự', category: 'ap',
        cost: 2750, icon: 'assets/item/kiem_thap_tu.png',
        stats: { ap: 175, cdr: 0.10 },
        speedPercentBonus: 0.02,
        uniquePassiveName: 'KiếmThậpTự_Passives',
        desc: '+175 Công phép, +2% Tốc chạy, +10% Giảm hồi chiêu\nẤn Diệt Quỷ (NTDN): Tích lũy tối đa 30 điểm (+30% tổng AP).',
        recipe: ['dao_phep_thuat', 'gay_phu_thuy', 'ngoc_hach']
    },
    'ma_thien_kiem': {
        id: 'ma_thien_kiem', name: 'Ma Thiên Kiếm', category: 'ap',
        cost: 2650, icon: 'assets/item/ma_thien_kiem.png',
        stats: { ap: 150, cdr: 0.10, attackSpeedBonus: 0.20 },
        uniquePassiveName: 'Ma Thiên Oán Hận',
        desc: '+150 Công phép, +10% Giảm hồi chiêu, +20% Tốc đánh\nTốc Đánh Liên Hồi (NTDN): Đánh thường trúng quái tăng 20% tốc đánh (tối đa 2 lần).\nOán Hận (NTDN - CD 0.3s): Đòn đánh thường gây thêm 10 + 17.5% AP + 2.5% AD sát thương phép.',
        recipe: ['phi_tieu', 'gay_phu_thuy', 'ngoc_hach']
    },
    'than_hac_dao': {
        id: 'than_hac_dao', name: 'Thần Hắc Đao', category: 'ap',
        cost: 3050, icon: 'assets/item/than_hac_dao.png',
        stats: { ap: 170, cdr: 0.05, maxHp: 250 },
        uniquePassiveName: 'Thần Chú',
        uniqueCooldown: 3.0,
        desc: '+170 Công phép, +5% Giảm hồi chiêu, +250 Máu\nThần Chú (NTDN - CD 3s): Sau khi dùng chiêu, đòn đánh thường tiếp theo gây thêm (75% AP + 25% AD) sát thương phép.',
        recipe: ['gay_chu_thuat', 'gay_phu_thuy', 'ngoc_hach', 'ngoc_moc']
    },
    'quan_doc_tinh': {
        id: 'quan_doc_tinh', name: 'Quản Độc Tính', category: 'ap',
        cost: 2850, icon: 'assets/item/quan_doc_tinh.png',
        stats: { ap: 140, cdr: 0.10, maxHp: 400 },
        uniquePassiveName: 'Độc Tính',
        desc: '+140 Công phép, +10% Giảm hồi chiêu, +400 Máu\nĐộc Tính (NTDN): Tung chiêu trúng địch khiến địch dính độc 5s, mỗi giây chịu sát thương phép bằng 3% HP quái.',
        recipe: ['loa_phong_thanh', 'ngoc_hach', 'ngoc_moc', 'ngoc_moc']
    },
    'vong_tay_anh_sang': {
        id: 'vong_tay_anh_sang', name: 'Vòng Tay Ánh Sáng', category: 'ap',
        cost: 2950, icon: 'assets/item/vong_tay_anh_sang.png',
        stats: { ap: 30 },
        uniquePassiveName: 'Phần Thưởng Thần Thánh',
        desc: 'Phần Thưởng Thần Thánh (NTDN): Nhận ngay 1 điểm khi mua. Mỗi 30s tích thêm 1 điểm (tối đa 15). Mỗi điểm cộng: +100 HP, +15 AP, +5 Mana tối đa.',
        recipe: ['gang_tay_anh_hung', 'gay_phu_thuy', 'ngoc_moc', 'ngoc_moc', 'ngoc_moc']
    },

    // ==========================================
    // NHÓM PHÒNG THỦ (DEF)
    // ==========================================
    'giap_vai': {
        id: 'giap_vai', name: 'Giáp Vải', category: 'def',
        cost: 320, icon: 'assets/item/giap_vai.png',
        stats: { armor: 15 }, desc: '+15 Giáp', recipe: []
    },
    'ngoc_mau': {
        id: 'ngoc_mau', name: 'Ngọc Máu', category: 'def',
        cost: 350, icon: 'assets/item/ngoc_mau.png',
        stats: { maxHp: 180 }, desc: '+180 Máu tối đa', recipe: []
    },
    'khien_ma_thuat': {
        id: 'khien_ma_thuat', name: 'Khiên Ma Thuật', category: 'def',
        cost: 340, icon: 'assets/item/khien_ma_thuat.png',
        stats: { mr: 20 }, desc: '+20 Kháng phép', recipe: []
    },
    'riu_chien': {
        id: 'riu_chien', name: 'Rìu Chiến', category: 'def',
        cost: 500, icon: 'assets/item/riu_chien.png',
        stats: { armor: 7 },
        uniqueStats: { expBonus: 25 },
        uniquePassiveName: 'Săn Rừng',
        desc: '+7 Giáp\n+25% EXP từ quái (NTDN)\nSăn Rừng (NTDN): Đòn đánh thêm 8 sát thương chuẩn lên quái.',
        recipe: []
    },
    'ao_choang_chien_binh': {
        id: 'ao_choang_chien_binh', name: 'Áo Choàng Chiến Binh', category: 'def',
        cost: 1100, icon: 'assets/item/ao_choang_chien_binh.png',
        stats: { maxHp: 670 }, desc: '+670 Máu tối đa', recipe: ['ngoc_mau', 'ngoc_mau']
    },
    'gang_tay_chien_si': {
        id: 'gang_tay_chien_si', name: 'Găng Tay Chiến Sĩ', category: 'def',
        cost: 1250, icon: 'assets/item/gang_tay_chien_si.png',
        stats: { armor: 75, cdr: 0.10 }, desc: '+75 Giáp, +10% Giảm hồi chiêu', recipe: ['giap_vai', 'giap_vai']
    },
    'riu_lua': {
        id: 'riu_lua', name: 'Rìu Lửa', category: 'def',
        cost: 1200, icon: 'assets/item/riu_lua.png',
        stats: { armor: 50 },
        uniqueStats: { expBonus: 35 },
        uniquePassiveName: 'Rìu Lửa_Passives',
        desc: '+50 Giáp, +35% EXP từ quái (NTDN)\nSăn Rừng (NTDN): Quái đứng gần nhận 10 AP/s.\nẤn Diệt Quỷ (NTDN): Mỗi 20 quái hạ gục +1 điểm (tối đa 15). Mỗi điểm tăng 1% HP tối đa.',
        recipe: ['riu_chien', 'giap_vai']
    },
    'giap_linh_gac': {
        id: 'giap_linh_gac', name: 'Giáp Lính Gác', category: 'def',
        cost: 950, icon: 'assets/item/giap_linh_gac.png',
        stats: { armor: 20 },
        speedPercentBonus: 0.02,
        uniquePassiveName: 'Băng Sương Sơ',
        desc: '+20 Giáp, +2% Tốc chạy\nBăng Sương (NTDN): Quái gây sát thương lên bản thân sẽ bị giảm 20% tốc chạy và tốc đánh trong 10s.',
        recipe: ['giap_vai']
    },
    'vong_tay_linh_lan': {
        id: 'vong_tay_linh_lan', name: 'Vòng Tay Linh Lan', category: 'def',
        cost: 1150, icon: 'assets/item/vong_tay_linh_lan.png',
        stats: { mr: 55, maxHp: 200 },
        uniquePassiveName: 'Cầu Cứu Tinh Linh Sơ',
        uniqueCooldown: 15.0,
        desc: '+55 Kháng phép, +200 Máu\nCầu Cứu Tinh Linh (NTDN - CD 15s): Khi nhận sát thương, hồi phục 150 Máu trong 3s.',
        recipe: ['khien_ma_thuat', 'ngoc_mau']
    },
    'gang_tay_tuong_linh': {
        id: 'gang_tay_tuong_linh', name: 'Găng Tay Tướng Lĩnh', category: 'def',
        cost: 2950, icon: 'assets/item/gang_tay_tuong_linh.png',
        stats: { armor: 100, ad: 30 },
        uniquePassiveName: 'Cuồng Sát',
        uniqueCooldown: 30.0,
        desc: '+100 Giáp, +30 AD\nCuồng Sát (NTDN - CD 30s): Khi HP xuống dưới 30%, nhận ngay 1250 Máu ảo, +30% Song giáp, +1% Hút máu các loại và +20% Sát thương trong 5s.',
        recipe: ['gang_tay_chien_si', 'kiem_hiep_si']
    },
    'riu_hoa_long': {
        id: 'riu_hoa_long', name: 'Rìu Hỏa Long', category: 'def',
        cost: 2750, icon: 'assets/item/riu_hoa_long.png',
        stats: { armor: 105, maxHp: 250 },
        uniqueStats: { expBonus: 50 },
        uniquePassiveName: 'Rìu Hỏa Long_Passives',
        desc: '+105 Giáp, +250 Máu, +50% EXP quái (NTDN)\nSăn Rừng (NTDN): Gây 15 + 2% HP đã mất sát thương phép mỗi giây lên quái xung quanh.\nẤn Diệt Quỷ (NTDN): Tích lũy tối đa 30 điểm (+30% tổng HP).',
        recipe: ['riu_lua', 'ngoc_mau']
    },
    'khien_bang_ha': {
        id: 'khien_bang_ha', name: 'Khiên Băng Hà', category: 'def',
        cost: 2850, icon: 'assets/item/khien_bang_ha.png',
        stats: { armor: 80, maxHp: 1200 },
        speedPercentBonus: 0.03,
        uniquePassiveName: 'Băng Sương Cao',
        desc: '+80 Giáp, +1200 Máu, +3% Tốc chạy\nBăng Sương (NTDN): Quái tấn công bản thân sẽ bị giảm 50% tốc chạy và tốc đánh trong 10s.',
        recipe: ['giap_linh_gac', 'ao_choang_chien_binh']
    },
    'giay_bang_ha': {
        id: 'giay_bang_ha', name: 'Giày Băng Hà', category: 'def',
        cost: 2900, icon: 'assets/item/giay_bang_ha.png',
        stats: { armor: 270, cdr: 0.20 },
        speedPercentBonus: 0.02,
        uniquePassiveName: 'Chân Lạnh',
        desc: '+270 Giáp, +2% Tốc chạy, +20% Giảm hồi chiêu\nChân Lạnh (NTDN): Quái lại gần phạm vi 180px sẽ bị làm chậm 50% tốc chạy.',
        recipe: ['giap_vai', 'gang_tay_chien_si']
    },
    'nang_luong_beacon': {
        id: 'nang_luong_beacon', name: 'Năng Lượng Beacon', category: 'def',
        cost: 3250, icon: 'assets/item/nang_luong_beacon.png',
        stats: { maxHp: 2200, armor: 50, mr: 50 },
        uniquePassiveName: 'Linh Hồn Cỏ Cây',
        desc: '+2200 Máu, +50 Giáp, +50 Kháng phép\nLinh Hồn Cỏ Cây (NTDN): Mỗi giây hồi 0.25% HP. Nếu không nhận/gây sát thương trong 5s, hồi phục tăng vọt lên 1.5% HP/s.',
        recipe: ['ao_choang_chien_binh', 'giap_vai', 'khien_ma_thuat']
    },
    'ao_choang_thien_nhien': {
        id: 'ao_choang_thien_nhien', name: 'Áo Choàng Thiên Nhiên', category: 'def',
        cost: 2850, icon: 'assets/item/ao_choang_thien_nhien.png',
        stats: { mr: 150, maxHp: 800 },
        uniquePassiveName: 'Cầu Cứu Tinh Linh Cao',
        uniqueCooldown: 12.0,
        desc: '+150 Kháng phép, +800 Máu\nCầu Cứu Tinh Linh (NTDN - CD 12s): Khi nhận sát thương, hồi phục 4% HP tối đa trong 3s.',
        recipe: ['vong_tay_linh_lan', 'ao_choang_chien_binh']
    },
    'khien_panorama': {
        id: 'khien_panorama', name: 'Khiên Panorama', category: 'def',
        cost: 2950, icon: 'assets/item/khien_panorama.png',
        stats: { mr: 170, maxHp: 1000 },
        uniquePassiveName: 'Khiên Phép Panorama',
        desc: '+170 Kháng phép, +1000 Máu\nKhiên Phép (NTDN): Cung cấp 1200 Máu ảo phép (chỉ chặn sát thương phép), tự làm mới sau mỗi 15s.',
        recipe: ['vong_tay_linh_lan', 'ao_choang_chien_binh']
    },
    'giap_thong_kho': {
        id: 'giap_thong_kho', name: 'Giáp Thống Khổ', category: 'def',
        cost: 3100, icon: 'assets/item/giap_thong_kho.png',
        stats: { armor: 230, maxHp: 1100 },
        uniquePassiveName: 'Phản Chiếu',
        desc: '+230 Giáp, +1100 Máu\nPhản Chiếu (NTDN - CD 0.25s): Phản lại 50% sát thương gốc chưa giảm trừ của quái thành sát thương phép lên quái.',
        recipe: ['gang_tay_chien_si', 'ao_choang_chien_binh']
    },

    // ==========================================
    // NHÓM TỐC CHẠY (SPEED)
    // ==========================================
    'giay_thuong': {
        id: 'giay_thuong', name: 'Giày Thường', category: 'speed',
        cost: 450, icon: 'assets/item/giay_thuong.png',
        uniqueStats: { speed: 0.70 },
        uniquePassiveName: 'Giày Thường Chạy',
        desc: '+70 Tốc chạy (NTDN)', recipe: []
    },
    'giay_cuong_phong': {
        id: 'giay_cuong_phong', name: 'Giày Cuồng Phong', category: 'speed',
        cost: 1150, icon: 'assets/item/giay_cuong_phong.png',
        uniqueStats: { speed: 0.70, attackSpeedBonus: 0.20 },
        uniquePassiveName: 'Giày Cuồng Phong Tốc',
        desc: '+70 Tốc chạy, +20% Tốc đánh (NTDN)',
        recipe: ['giay_thuong', 'short_kiem']
    },
    'giay_ho_ve': {
        id: 'giay_ho_ve', name: 'Giày Hộ Vệ', category: 'speed',
        cost: 1150, icon: 'assets/item/giay_ho_ve.png',
        uniqueStats: { speed: 0.70, armor: 100 },
        uniquePassiveName: 'Giày Hộ Vệ Def',
        desc: '+70 Tốc chạy, +100 Giáp (NTDN)\nGiảm 15% sát thương vật lý nhận vào (NTDN).',
        recipe: ['giay_thuong', 'giap_vai']
    }
};

// ==========================================================================
// HỆ THỐNG GHÉP ĐỒ ĐỆ QUY
// ==========================================================================
function getComponentMatches(targetItemId, inventory) {
    let target = ITEMS_DATABASE[targetItemId];
    if (!target || !target.recipe || target.recipe.length === 0) {
        return { consumedIndices: [], totalDiscount: 0, finalCost: target ? target.cost : 0 };
    }

    let invPool = inventory.map((id, index) => ({
        id, index, used: false,
        cost: (ITEMS_DATABASE[id] ? ITEMS_DATABASE[id].cost : 0)
    }));

    function matchRequirement(reqId) {
        let reqItem = ITEMS_DATABASE[reqId];
        if (!reqItem) return;

        let directMatch = invPool.find(slot => !slot.used && slot.id === reqId);
        if (directMatch) {
            directMatch.used = true;
            return;
        }

        if (reqItem.recipe && reqItem.recipe.length > 0) {
            for (let subReq of reqItem.recipe) {
                matchRequirement(subReq);
            }
        }
    }

    for (let reqId of target.recipe) {
        matchRequirement(reqId);
    }

    let consumedSlots = invPool.filter(s => s.used);
    let consumedIndices = consumedSlots.map(s => s.index);
    let totalDiscount = consumedSlots.reduce((sum, s) => sum + s.cost, 0);
    let finalCost = Math.max(0, target.cost - totalDiscount);

    return { consumedIndices, totalDiscount, finalCost };
}
window.getComponentMatches = getComponentMatches;

// ==========================================================================
// HỆ THỐNG KIỂM TRA NỘI TẠI & TÍNH TOÁN CHỈ SỐ
// ==========================================================================
function playerHasUniquePassive(player, passiveName) {
    if (!player || !player.inventory) return false;
    for (let itemId of player.inventory) {
        let item = ITEMS_DATABASE[itemId];
        if (item && (item.uniquePassiveName === passiveName || item.id === passiveName)) return true;
    }
    return false;
}

// Xử lý hiệu ứng khi tung chiêu (Skill Cast Trigger)
function hookOnCastSkillItems(player) {
    if (!player) return;
    if (playerHasUniquePassive(player, 'Ma Chú')) {
        player.hasMaChuBuff = true;
    }
    if (playerHasUniquePassive(player, 'Thần Chú')) {
        player.hasThanChuBuff = true;
    }
}
window.hookOnCastSkillItems = hookOnCastSkillItems;

// Xử lý đòn đánh/kỹ năng trúng mục tiêu (On-Hit Passives)
function processItemOnHitPassives(attacker, target, proj) {
    if (!attacker || !target || target.dead) return;

    if (typeof hookCardOnHit === 'function') {
        hookCardOnHit(attacker, target, proj);
    }

    if (proj && proj.isBonusBullet) return;
    let isBasic = proj && (proj.attackType === 'basic_attack' || proj.attackType === 'basic');
    let isSkill = proj && proj.attackType === 'skill';

    // 1. Săn rừng chuẩn (+8 STC lên quái)
    if (playerHasUniquePassive(attacker, 'Săn Rừng') && target.isMonster) {
        target.takeDamage(8, 'true', attacker, false, 'dot');
    }

    // 2. Săn rừng Kartana / Gươm Diệt Quỷ
    if (playerHasUniquePassive(attacker, 'Kartana_Passives') && target.isMonster) {
        let extra = (8 + Math.random() * 2) + (attacker.stats.ad * 0.10);
        target.takeDamage(extra, 'true', attacker, false, 'dot');
    }
    if (playerHasUniquePassive(attacker, 'Gươm Diệt Quỷ_Passives') && target.isMonster) {
        let extra = (12 + Math.random() * 3) + (attacker.stats.ad * 0.15);
        target.takeDamage(extra, 'true', attacker, false, 'dot');
    }

    // 3. Phi Tiêu: Găm Sâu
    if (playerHasUniquePassive(attacker, 'Găm Sâu')) {
        let bonusPhys = 2 + Math.random() * 3;
        target.takeDamage(bonusPhys, 'physical', attacker, false, 'dot');
    }

    // 4. Sát Chớp Kiếm
    if (isBasic && playerHasUniquePassive(attacker, 'Bạo Kích Chớp')) {
        attacker.satChopStacks = Math.min(5, (attacker.satChopStacks || 0) + 1);
        attacker.satChopTimer = 1.25;
        recalculatePlayerStats(attacker);
    }

    // 5. Ma Thiên Kiếm (Tốc đánh liên hồi & Oán Hận)
    if (isBasic && playerHasUniquePassive(attacker, 'Ma Thiên Oán Hận')) {
        attacker.mtkStacks = Math.min(2, (attacker.mtkStacks || 0) + 1);
        attacker.mtkTimer = 2.0;
        recalculatePlayerStats(attacker);

        if (!attacker.itemCooldowns) attacker.itemCooldowns = {};
        if ((attacker.itemCooldowns['oan_han'] || 0) <= 0) {
            attacker.itemCooldowns['oan_han'] = 0.3;
            let bonusApDmg = 10 + (attacker.stats.ap * 0.175) + (attacker.stats.ad * 0.025);
            target.takeDamage(bonusApDmg, 'magic', attacker, false, 'item');
        }
    }

    // 6. Gậy Chú Thuật: Ma Chú (khi có buff)
    if (isBasic && attacker.hasMaChuBuff) {
        if (!attacker.itemCooldowns) attacker.itemCooldowns = {};
        if ((attacker.itemCooldowns['ma_chu'] || 0) <= 0) {
            attacker.hasMaChuBuff = false;
            attacker.itemCooldowns['ma_chu'] = 3.0;
            let dmg = 30 + Math.random() * 90;
            target.takeDamage(dmg, 'magic', attacker, false, 'item');
        }
    }

    // 7. Thần Hắc Đao: Thần Chú (khi có buff)
    if (isBasic && attacker.hasThanChuBuff) {
        if (!attacker.itemCooldowns) attacker.itemCooldowns = {};
        if ((attacker.itemCooldowns['than_chu'] || 0) <= 0) {
            attacker.hasThanChuBuff = false;
            attacker.itemCooldowns['than_chu'] = 3.0;
            let dmg = (attacker.stats.ap * 0.75) + (attacker.stats.ad * 0.25);
            target.takeDamage(dmg, 'magic', attacker, false, 'item');
        }
    }

    // 8. Loa Phóng Thanh: Vang Vọng Sơ (CD 5s)
    if (isSkill && playerHasUniquePassive(attacker, 'Vang Vọng Sơ')) {
        if (!attacker.itemCooldowns) attacker.itemCooldowns = {};
        if ((attacker.itemCooldowns['vang_vong_so'] || 0) <= 0) {
            attacker.itemCooldowns['vang_vong_so'] = 5.0;
            let blastDmg = 20 + Math.random() * 50;
            if (typeof createShockwave === 'function') createShockwave(target.x, target.y, '#9b59b6', 70);
            gameState.enemies.forEach(e => {
                if (!e.dead && Math.hypot(e.x - target.x, e.y - target.y) <= 85) {
                    e.takeDamage(blastDmg, 'magic', attacker, false, 'item');
                }
            });
        }
    }

    // 9. Hỏa Thạch Âm: Vang Vọng Cao (CD 4.5s)
    if (isSkill && playerHasUniquePassive(attacker, 'Vang Vọng Cao')) {
        if (!attacker.itemCooldowns) attacker.itemCooldowns = {};
        if ((attacker.itemCooldowns['vang_vong_cao'] || 0) <= 0) {
            attacker.itemCooldowns['vang_vong_cao'] = 4.5;
            let blastDmg = 50 + (attacker.stats.ap * 0.20);
            if (typeof createShockwave === 'function') createShockwave(target.x, target.y, '#e74c3c', 110);
            gameState.enemies.forEach(e => {
                if (!e.dead && Math.hypot(e.x - target.x, e.y - target.y) <= 125) {
                    e.takeDamage(blastDmg, 'magic', attacker, false, 'item');
                }
            });
        }
    }

    // 10. Quản Độc Tính (Độc 5s, 3% hp quái/s)
    if (isSkill && playerHasUniquePassive(attacker, 'Độc Tính') && target.isMonster) {
        let poisonPerSec = (target.stats && target.stats.maxHp ? target.stats.maxHp : 750) * 0.03;
        target.burnDmg = Math.max(target.burnDmg || 0, poisonPerSec);
        target.burnAttacker = attacker;
        target.burnTimer = 5.0;
        target.burnTickTimer = 1.0;
    }

    // 11. Lôi Thần Kiếm
    if (isBasic && playerHasUniquePassive(attacker, 'Chớp Điện')) {
        let lightningDmg = 25 + attacker.stats.ad * 0.20;
        let chainCount = 0;
        let maxChain = 3 + Math.floor(Math.random() * 2);
        let prevTarget = target;

        let nearby = gameState.enemies.filter(e => !e.dead && e !== target && Math.hypot(e.x - target.x, e.y - target.y) <= 190);
        nearby.sort((a, b) => Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b.x - target.x, b.y - target.y));

        for (let enemy of nearby) {
            if (chainCount >= maxChain) break;
            chainCount++;
            if (typeof drawCyanLightningBoltVFX === 'function') {
                drawCyanLightningBoltVFX(prevTarget.x, prevTarget.y, enemy.x, enemy.y);
            }
            enemy.takeDamage(lightningDmg, 'magic', attacker, false, 'item');
            prevTarget = enemy;
        }
    }

    // 12. Súng Hải Tặc
    if (playerHasUniquePassive(attacker, 'Siêu tốc đánh thường') && isBasic) {
        setTimeout(() => {
            if (target && !target.dead && attacker && !attacker.dead) {
                let angle = Math.atan2(target.y - attacker.y, target.x - attacker.x);
                let lv = attacker.level || 1;
                let baseExtra = lv * 1.5 + (attacker.stats.ad * 0.05);
                let isCrit = (Math.random() * 100 < attacker.stats.critRate);
                if (isCrit) baseExtra *= (2.0 + (attacker.stats.critDamage || 0) / 100);

                gameState.projectiles.push(new Projectile({
                    owner: attacker, attackType: 'item',
                    x: attacker.x, y: attacker.y,
                    vx: Math.cos(angle), vy: Math.sin(angle),
                    radius: 4, speed: 15, damage: baseExtra, dmgType: 'physical',
                    color: '#ffeb3b', isCrit: isCrit, isBonusBullet: true, range: 600
                }));
            }
        }, 100);
    }

    // 13. Pháo Công
    if (playerHasUniquePassive(attacker, 'Săn lùng')) {
        if (!attacker.itemCooldowns) attacker.itemCooldowns = {};
        let cd = attacker.itemCooldowns['phao_cong'] || attacker.itemCooldowns['Săn lùng'] || 0;
        if (cd <= 0) {
            attacker.itemCooldowns['phao_cong'] = 5.0;
            attacker.itemCooldowns['Săn lùng'] = 5.0;

            let monsterMaxHp = (target.stats && target.stats.maxHp) ? target.stats.maxHp : 750;
            let primaryMagicExtra = monsterMaxHp * 0.07;
            let isCrit = (Math.random() * 100 < attacker.stats.critRate);
            if (isCrit) primaryMagicExtra *= (2.0 + ((attacker.stats.critDamage || 0) / 100));

            target.takeDamage(primaryMagicExtra, 'magic', attacker, isCrit, 'item');
            if (typeof createShockwave === 'function') createShockwave(target.x, target.y, '#c56cf0', 90);

            let splashMagicDmg = primaryMagicExtra * 0.15;
            let blastRadius = 115;
            gameState.enemies.forEach(sub => {
                if (!sub.dead && sub !== target && Math.hypot(sub.x - target.x, sub.y - target.y) <= blastRadius) {
                    sub.takeDamage(splashMagicDmg, 'magic', attacker, false, 'item');
                }
            });
        }
    }
}

function recalculatePlayerStats(player) {
    if (!player) return;

    let b = player.baseStats;
    let bn = player.bonusStats;
    let s = player.stats;

    if (!player._vampDivided) {
        if (b.lifesteal) b.lifesteal = b.lifesteal / 10;
        if (b.spellVamp) b.spellVamp = b.spellVamp / 10;
        player._vampDivided = true;
    }

    let hpRatio = s.maxHp > 0 ? s.hp / s.maxHp : 1;
    let mpRatio = s.maxMana > 0 ? s.mana / s.maxMana : 1;

    s.maxHp = b.maxHp + (bn.maxHp || 0);
    s.maxMana = b.maxMana + (bn.maxMana || 0);
    s.hpRegen = b.hpRegen + (bn.hpRegen || 0);
    s.manaRegen = b.manaRegen + (bn.manaRegen || 0);
    s.ad = b.ad + (bn.ad || 0);
    s.ap = b.ap + (bn.ap || 0);
    s.armor = b.armor + (bn.armor || 0);
    s.mr = b.mr + (bn.mr || 0);
    s.armorPen = (b.armorPen || 0) + (bn.armorPen || 0);
    s.magicPen = (b.magicPen || 0) + (bn.magicPen || 0);
    s.speed = b.speed + (bn.speed || 0);
    s.cdr = (b.cdr || 0) + (bn.cdr || 0);
    s.lifesteal = (b.lifesteal || 0) + (bn.lifesteal || 0);
    s.spellVamp = (b.spellVamp || 0) + (bn.spellVamp || 0);
    s.critRate = (b.critRate || 0) + (bn.critRate || 0);
    s.critDamage = (b.critDamage || 0) + (bn.critDamage || 0);
    s.expBonus = (b.expBonus || 0) + (bn.expBonus || 0);
    player.attackSpeedBonus = bn.attackSpeedBonus || 0;

    let activePassives = new Set();
    let speedPercentTotal = 0;

    let hanKhiBonus = 1 + ((player.cardRanks && player.cardRanks['han_khi']) ? player.cardRanks['han_khi'] * 0.20 : 0);

    // Điểm thưởng Vòng Tay Ánh Sáng
    if (player.vtasPoints && player.vtasPoints > 0) {
        let pts = Math.min(15, player.vtasPoints);
        s.maxHp += pts * 100;
        s.ap += pts * 15;
        s.maxMana += pts * 5;
    }

    player.inventory.forEach(itemId => {
        let it = ITEMS_DATABASE[itemId];
        if (!it) return;

        if (it.stats) {
            let boostedStats = {};
            for (let k in it.stats) {
                boostedStats[k] = it.stats[k] * hanKhiBonus;
            }
            applyObjStats(player, boostedStats);
        }

        if (it.speedPercentBonus) speedPercentTotal += it.speedPercentBonus;
        if (it.uniqueStats) {
            let pKey = it.uniquePassiveName || it.id;
            if (!activePassives.has(pKey)) {
                applyObjStats(player, it.uniqueStats);
                activePassives.add(pKey);
            }
        }
    });

    // Cộng dồn Tốc đánh Sát Chớp Kiếm
    if (player.satChopStacks && player.satChopStacks > 0) {
        player.attackSpeedBonus += player.satChopStacks * 0.15;
    }

    // Cộng dồn Tốc đánh Ma Thiên Kiếm
    if (player.mtkStacks && player.mtkStacks > 0) {
        player.attackSpeedBonus += player.mtkStacks * 0.20;
    }

    // Buff Hắc Kiếm Dracula
    if (player.draculaBuffTimer > 0) {
        s.lifesteal += 7.5;
    }

    // Buff Cuồng Sát (Găng Tay Tướng Lĩnh)
    if (player.cuongSatBuffTimer > 0) {
        s.armor *= 1.30;
        s.mr *= 1.30;
        s.lifesteal += 1.0;
        s.spellVamp += 1.0;
    }

    if (speedPercentTotal > 0) {
        s.speed += b.speed * speedPercentTotal;
    }

    // Ấn Diệt Quỷ AD (Kartana / Gươm Diệt Quỷ)
    let hasKartana = playerHasUniquePassive(player, 'Kartana_Passives');
    let hasGuom = playerHasUniquePassive(player, 'Gươm Diệt Quỷ_Passives');
    if (hasKartana || hasGuom) {
        let markPoints = player.demonMarks || 0;
        let maxAllowed = hasGuom ? 30 : 15;
        let applied = Math.min(maxAllowed, markPoints);
        s.ad = s.ad * (1 + applied / 100);
    }

    // Ấn Diệt Quỷ AP (Dao Phép Thuật / Kiếm Thập Tự)
    let hasDaoPhep = playerHasUniquePassive(player, 'DaoPhép_Passives');
    let hasKiemThapTu = playerHasUniquePassive(player, 'KiếmThậpTự_Passives');
    if (hasDaoPhep || hasKiemThapTu) {
        let apMarks = player.apDemonMarks || 0;
        let maxAllowed = hasKiemThapTu ? 30 : 15;
        let applied = Math.min(maxAllowed, apMarks);
        s.ap = s.ap * (1 + applied / 100);
    }

    // Ấn Diệt Quỷ HP (Rìu Lửa / Rìu Hỏa Long)
    let hasRiuLua = playerHasUniquePassive(player, 'Rìu Lửa_Passives');
    let hasRiuHoaLong = playerHasUniquePassive(player, 'Rìu Hỏa Long_Passives');
    if (hasRiuLua || hasRiuHoaLong) {
        let hpMarks = player.hpDemonMarks || 0;
        let maxAllowed = hasRiuHoaLong ? 30 : 15;
        let applied = Math.min(maxAllowed, hpMarks);
        s.maxHp = s.maxHp * (1 + applied / 100);
    }

    s.attackSpeed = b.attackSpeed / (1 + player.attackSpeedBonus);
    s.hp = Math.min(s.maxHp, Math.max(1, s.maxHp * hpRatio));
    s.mana = Math.min(s.maxMana, Math.max(0, s.maxMana * mpRatio));
}

function applyObjStats(player, s) {
    let p = player.stats;
    if (s.ad) p.ad += s.ad;
    if (s.ap) p.ap += s.ap;
    if (s.maxHp) p.maxHp += s.maxHp;
    if (s.hpRegen) p.hpRegen += s.hpRegen;
    if (s.maxMana) p.maxMana += s.maxMana;
    if (s.manaRegen) p.manaRegen += s.manaRegen;
    if (s.armor) p.armor += s.armor;
    if (s.mr) p.mr += s.mr;
    if (s.armorPen) p.armorPen += s.armorPen;
    if (s.magicPen) p.magicPen += s.magicPen;
    if (s.speed) p.speed += s.speed;
    if (s.cdr) p.cdr += s.cdr;
    if (s.lifesteal) p.lifesteal += s.lifesteal;
    if (s.spellVamp) p.spellVamp += s.spellVamp;
    if (s.critRate) p.critRate += s.critRate;
    if (s.critDamage) p.critDamage += s.critDamage;
    if (s.expBonus) p.expBonus += s.expBonus;
    if (s.attackSpeedBonus) player.attackSpeedBonus += s.attackSpeedBonus;
}