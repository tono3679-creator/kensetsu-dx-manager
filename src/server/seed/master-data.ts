import type { AppRole, ConstructionType, EmploymentStatus, ExpenseCategory } from "@/types/domain";

/**
 * デモ企業「株式会社山田設備」のマスタデータ。
 * すべて架空の企業・人物・住所です（メールアドレスは予約済みドメイン .example を使用）。
 */

export const COMPANY_NAME = "株式会社山田設備";

/** デモログインユーザーの固定ID（再起動・データ初期化後もセッションが維持されるよう固定） */
export const DEMO_AUTH_USER_IDS = {
  admin: "00000000-0000-4000-8000-000000000001",
  manager: "00000000-0000-4000-8000-000000000002",
  staff: "00000000-0000-4000-8000-000000000003",
} as const;

export type DepartmentKey = "admin" | "sales" | "electrical" | "mechanical";

export const DEPARTMENTS: ReadonlyArray<{ key: DepartmentKey; name: string; sortOrder: number }> = [
  { key: "admin", name: "管理部", sortOrder: 1 },
  { key: "sales", name: "営業部", sortOrder: 2 },
  { key: "electrical", name: "工事一課（電気）", sortOrder: 3 },
  { key: "mechanical", name: "工事二課（空調・設備）", sortOrder: 4 },
];

export type EmployeeKey =
  | "yamada"
  | "sasaki"
  | "ito"
  | "suzuki"
  | "takahashi"
  | "watanabe"
  | "tanaka"
  | "kobayashi"
  | "nakamura"
  | "yoshida"
  | "kato"
  | "matsumoto"
  | "inoue";

/** 勤怠の付き方: field=現場作業員 / office=内勤 / none=勤怠なし（役員・休職・退職） */
export type AttendanceKind = "field" | "office" | "none";

export interface EmployeeSeed {
  key: EmployeeKey;
  code: string;
  lastName: string;
  firstName: string;
  lastNameKana: string;
  firstNameKana: string;
  email: string;
  phone: string;
  department: DepartmentKey;
  position: string;
  role: AppRole;
  hourlyCost: number;
  hireDate: string;
  status: EmploymentStatus;
  attendance: AttendanceKind;
  loginAs?: keyof typeof DEMO_AUTH_USER_IDS;
}

export const EMPLOYEES: readonly EmployeeSeed[] = [
  { key: "yamada", code: "E0001", lastName: "山田", firstName: "太一", lastNameKana: "やまだ", firstNameKana: "たいち", email: "admin@yamada-setsubi.example", phone: "090-1000-0001", department: "admin", position: "代表取締役", role: "admin", hourlyCost: 4500, hireDate: "2008-04-01", status: "active", attendance: "none", loginAs: "admin" },
  { key: "sasaki", code: "E0002", lastName: "佐々木", firstName: "美穂", lastNameKana: "ささき", firstNameKana: "みほ", email: "sasaki@yamada-setsubi.example", phone: "090-1000-0002", department: "admin", position: "経理・総務", role: "admin", hourlyCost: 2200, hireDate: "2015-10-01", status: "active", attendance: "office" },
  { key: "ito", code: "E0003", lastName: "伊藤", firstName: "直樹", lastNameKana: "いとう", firstNameKana: "なおき", email: "ito@yamada-setsubi.example", phone: "090-1000-0003", department: "sales", position: "営業課長", role: "manager", hourlyCost: 3200, hireDate: "2012-04-01", status: "active", attendance: "office" },
  { key: "suzuki", code: "E0004", lastName: "鈴木", firstName: "一郎", lastNameKana: "すずき", firstNameKana: "いちろう", email: "manager@yamada-setsubi.example", phone: "090-1000-0004", department: "electrical", position: "工事一課 課長", role: "manager", hourlyCost: 3500, hireDate: "2010-04-01", status: "active", attendance: "field", loginAs: "manager" },
  { key: "takahashi", code: "E0005", lastName: "高橋", firstName: "健二", lastNameKana: "たかはし", firstNameKana: "けんじ", email: "takahashi@yamada-setsubi.example", phone: "090-1000-0005", department: "mechanical", position: "工事二課 課長", role: "manager", hourlyCost: 3400, hireDate: "2011-04-01", status: "active", attendance: "field" },
  { key: "watanabe", code: "E0006", lastName: "渡辺", firstName: "翔太", lastNameKana: "わたなべ", firstNameKana: "しょうた", email: "watanabe@yamada-setsubi.example", phone: "090-1000-0006", department: "mechanical", position: "主任", role: "manager", hourlyCost: 3000, hireDate: "2016-04-01", status: "active", attendance: "field" },
  { key: "tanaka", code: "E0007", lastName: "田中", firstName: "太郎", lastNameKana: "たなか", firstNameKana: "たろう", email: "staff@yamada-setsubi.example", phone: "090-1000-0007", department: "electrical", position: "電気工事士", role: "staff", hourlyCost: 2500, hireDate: "2018-04-01", status: "active", attendance: "field", loginAs: "staff" },
  { key: "kobayashi", code: "E0008", lastName: "小林", firstName: "拓海", lastNameKana: "こばやし", firstNameKana: "たくみ", email: "kobayashi@yamada-setsubi.example", phone: "090-1000-0008", department: "electrical", position: "電気工事士", role: "staff", hourlyCost: 2200, hireDate: "2021-04-01", status: "active", attendance: "field" },
  { key: "nakamura", code: "E0009", lastName: "中村", firstName: "大輔", lastNameKana: "なかむら", firstNameKana: "だいすけ", email: "nakamura@yamada-setsubi.example", phone: "090-1000-0009", department: "mechanical", position: "配管工", role: "staff", hourlyCost: 2400, hireDate: "2017-07-01", status: "active", attendance: "field" },
  { key: "yoshida", code: "E0010", lastName: "吉田", firstName: "誠", lastNameKana: "よしだ", firstNameKana: "まこと", email: "yoshida@yamada-setsubi.example", phone: "090-1000-0010", department: "mechanical", position: "空調設備工", role: "staff", hourlyCost: 2600, hireDate: "2014-04-01", status: "active", attendance: "field" },
  { key: "kato", code: "E0011", lastName: "加藤", firstName: "優斗", lastNameKana: "かとう", firstNameKana: "ゆうと", email: "kato@yamada-setsubi.example", phone: "090-1000-0011", department: "mechanical", position: "見習い", role: "staff", hourlyCost: 1800, hireDate: "2025-04-01", status: "active", attendance: "field" },
  { key: "matsumoto", code: "E0012", lastName: "松本", firstName: "和也", lastNameKana: "まつもと", firstNameKana: "かずや", email: "matsumoto@yamada-setsubi.example", phone: "090-1000-0012", department: "electrical", position: "電気工事士", role: "staff", hourlyCost: 2300, hireDate: "2019-04-01", status: "retired", attendance: "none" },
  { key: "inoue", code: "E0013", lastName: "井上", firstName: "さくら", lastNameKana: "いのうえ", firstNameKana: "さくら", email: "inoue@yamada-setsubi.example", phone: "090-1000-0013", department: "admin", position: "事務", role: "staff", hourlyCost: 1900, hireDate: "2023-04-01", status: "on_leave", attendance: "none" },
];

export interface CustomerSeed {
  code: string;
  name: string;
  corporateName: string | null;
  contactPerson: string | null;
  phone: string;
  email: string | null;
  postalCode: string;
  address: string;
  memo: string | null;
}

export const CUSTOMERS: readonly CustomerSeed[] = [
  { code: "C0001", name: "グリーンハイツ管理", corporateName: "株式会社グリーンハイツ管理", contactPerson: "大島 浩二", phone: "03-5700-1101", email: "oshima@greenheights.example", postalCode: "144-0035", address: "東京都大田区南蒲田2-14-8", memo: "分譲マンション3棟（東・西・南棟）の管理会社。年間修繕計画に沿って定期的に発注あり。" },
  { code: "C0002", name: "東和不動産", corporateName: "東和不動産株式会社", contactPerson: "村井 健", phone: "03-5700-1102", email: "murai@towa-fudosan.example", postalCode: "143-0016", address: "東京都大田区大森北1-22-3 東和ビル5F", memo: "賃貸アパート・マンションのオーナー兼管理。新築案件の紹介あり。" },
  { code: "C0003", name: "さくら内科クリニック", corporateName: "医療法人さくら会", contactPerson: "事務長 野口 恵子", phone: "03-5700-1103", email: "office@sakura-clinic.example", postalCode: "146-0082", address: "東京都大田区池上4-3-12", memo: "診療時間外（平日18時以降・日曜）の作業を希望。" },
  { code: "C0004", name: "ひだまり介護センター", corporateName: "社会福祉法人ひだまり会", contactPerson: "施設長 岡田 美紀", phone: "03-5700-1104", email: "okada@hidamari.example", postalCode: "145-0062", address: "東京都大田区北千束1-8-5", memo: "入居者がいるため騒音・粉じん対策を徹底すること。" },
  { code: "C0005", name: "北斗フーズ", corporateName: "株式会社北斗フーズ", contactPerson: "工場長 菅原 誠", phone: "045-500-1105", email: "sugawara@hokuto-foods.example", postalCode: "230-0045", address: "神奈川県横浜市鶴見区末広町1-7-2", memo: "食品工場。HACCP 対応のため入場時は衛生講習の受講が必要。" },
  { code: "C0006", name: "大和ビルサービス", corporateName: "大和ビルサービス株式会社", contactPerson: "設備課 西田 剛", phone: "03-5700-1106", email: "nishida@yamato-bs.example", postalCode: "144-0051", address: "東京都大田区西蒲田7-45-1", memo: "ビルメンテナンス会社。法定点検に伴う改修工事を発注。" },
  { code: "C0007", name: "青葉市 総務部施設課", corporateName: "青葉市", contactPerson: "施設課 長谷川 亮", phone: "044-500-1107", email: null, postalCode: "210-0001", address: "神奈川県青葉市本町1-1（架空）", memo: "公共工事。入札・書類提出の期限に注意。" },
  { code: "C0008", name: "川口商店", corporateName: "有限会社川口商店", contactPerson: "川口 正", phone: "03-5700-1108", email: "kawaguchi@kawaguchi-shoten.example", postalCode: "144-0052", address: "東京都大田区蒲田5-30-11", memo: null },
  { code: "C0009", name: "ミナト物流", corporateName: "株式会社ミナト物流", contactPerson: "総務部 斎藤 隆", phone: "03-5700-1109", email: "saito@minato-logi.example", postalCode: "143-0006", address: "東京都大田区平和島3-2-10", memo: "倉庫の稼働を止めずに施工すること（夜間・休日作業あり）。" },
  { code: "C0010", name: "佐藤 健一 様", corporateName: null, contactPerson: null, phone: "090-5700-1110", email: "k-sato@mail.example", postalCode: "146-0094", address: "東京都大田区東矢口2-5-18", memo: "戸建て住宅。工事中は在宅。" },
  { code: "C0011", name: "高木 由美子 様", corporateName: null, contactPerson: null, phone: "090-5700-1111", email: null, postalCode: "145-0071", address: "東京都大田区田園調布本町36-4", memo: null },
  { code: "C0012", name: "サンライズホテル", corporateName: "株式会社サンライズホテル", contactPerson: "施設管理 小松 晃", phone: "03-5700-1112", email: "komatsu@sunrise-hotel.example", postalCode: "144-0043", address: "東京都大田区羽田4-1-15", memo: "客室稼働中の工事のため、フロアごとに工程を分割（第1期〜第3期）。" },
  { code: "C0013", name: "ベイサイドカフェ", corporateName: "合同会社ベイサイドカフェ", contactPerson: "オーナー 三浦 彩", phone: "03-5700-1113", email: "miura@bayside-cafe.example", postalCode: "143-0002", address: "東京都大田区城南島4-2-3", memo: "店舗営業日は火〜日。月曜に作業。" },
  { code: "C0014", name: "オオタ工務店", corporateName: "株式会社オオタ工務店", contactPerson: "工事部 太田 浩", phone: "03-5700-1114", email: "ota@ota-koumuten.example", postalCode: "146-0092", address: "東京都大田区下丸子3-9-7", memo: "元請工務店。新築住宅の電気・給排水設備を継続受注。" },
  { code: "C0015", name: "森下 正樹 様", corporateName: null, contactPerson: null, phone: "090-5700-1115", email: "morishita@mail.example", postalCode: "145-0065", address: "東京都大田区東雪谷5-12-3", memo: "以前に外壁塗装を施工。屋根の相談あり。" },
  { code: "C0016", name: "青葉学園", corporateName: "学校法人青葉学園", contactPerson: "事務局 藤本 健太", phone: "045-500-1116", email: "fujimoto@aoba-gakuen.example", postalCode: "227-0062", address: "神奈川県横浜市青葉区青葉台2-18-1", memo: "長期休暇中に工事を集中させる。" },
];

export interface CatalogItem {
  name: string;
  unit: string;
  unitPrice: number;
  supplier: string;
}

export const MATERIAL_CATALOG: Record<ConstructionType, readonly CatalogItem[]> = {
  electrical: [
    { name: "VVFケーブル 2.0mm-3C", unit: "m", unitPrice: 168, supplier: "株式会社関東電材" },
    { name: "CVケーブル 14sq-3C", unit: "m", unitPrice: 1280, supplier: "株式会社関東電材" },
    { name: "LEDベースライト 40形", unit: "台", unitPrice: 12800, supplier: "株式会社関東電材" },
    { name: "LEDダウンライト φ100", unit: "台", unitPrice: 6400, supplier: "株式会社関東電材" },
    { name: "分電盤 主幹75A 16回路", unit: "面", unitPrice: 86000, supplier: "株式会社関東電材" },
    { name: "PF管 φ22", unit: "巻", unitPrice: 4800, supplier: "東邦設備資材株式会社" },
    { name: "ケーブルラック 300W", unit: "本", unitPrice: 9800, supplier: "東邦設備資材株式会社" },
    { name: "配線用遮断器 2P20A", unit: "個", unitPrice: 2450, supplier: "株式会社関東電材" },
  ],
  hvac: [
    { name: "業務用エアコン 天井カセット 5馬力", unit: "台", unitPrice: 685000, supplier: "東邦設備資材株式会社" },
    { name: "ルームエアコン 2.8kW", unit: "台", unitPrice: 98000, supplier: "東邦設備資材株式会社" },
    { name: "冷媒配管 2分3分", unit: "m", unitPrice: 1850, supplier: "東邦設備資材株式会社" },
    { name: "ドレン管 VP25", unit: "本", unitPrice: 1200, supplier: "丸八管材株式会社" },
    { name: "室外機架台", unit: "台", unitPrice: 18500, supplier: "東邦設備資材株式会社" },
    { name: "冷媒ガス R32", unit: "本", unitPrice: 32000, supplier: "東邦設備資材株式会社" },
    { name: "全熱交換器", unit: "台", unitPrice: 245000, supplier: "東邦設備資材株式会社" },
  ],
  plumbing: [
    { name: "耐衝撃性塩ビ管 HIVP 25A", unit: "本", unitPrice: 2350, supplier: "丸八管材株式会社" },
    { name: "塩ビ管 VP 75A", unit: "本", unitPrice: 4200, supplier: "丸八管材株式会社" },
    { name: "架橋ポリエチレン管 16A", unit: "m", unitPrice: 520, supplier: "丸八管材株式会社" },
    { name: "ガス給湯器 24号", unit: "台", unitPrice: 168000, supplier: "丸八管材株式会社" },
    { name: "給水ポンプユニット", unit: "台", unitPrice: 1280000, supplier: "東邦設備資材株式会社" },
    { name: "継手・バルブ類", unit: "式", unitPrice: 35000, supplier: "丸八管材株式会社" },
    { name: "保温材 グラスウール", unit: "m", unitPrice: 780, supplier: "丸八管材株式会社" },
  ],
  renovation: [
    { name: "システムバス 1616", unit: "台", unitPrice: 520000, supplier: "丸八建材店" },
    { name: "洗面化粧台 W750", unit: "台", unitPrice: 98000, supplier: "丸八建材店" },
    { name: "システムキッチン I型2550", unit: "台", unitPrice: 680000, supplier: "丸八建材店" },
    { name: "クッションフロア", unit: "㎡", unitPrice: 2400, supplier: "丸八建材店" },
    { name: "ビニールクロス", unit: "㎡", unitPrice: 1100, supplier: "丸八建材店" },
    { name: "石膏ボード 12.5mm", unit: "枚", unitPrice: 680, supplier: "丸八建材店" },
  ],
  painting: [
    { name: "シリコン塗料 15kg", unit: "缶", unitPrice: 18500, supplier: "中央塗料販売株式会社" },
    { name: "下塗りシーラー 15kg", unit: "缶", unitPrice: 12800, supplier: "中央塗料販売株式会社" },
    { name: "養生テープ・マスカー", unit: "式", unitPrice: 28000, supplier: "中央塗料販売株式会社" },
    { name: "変成シリコンコーキング", unit: "本", unitPrice: 980, supplier: "中央塗料販売株式会社" },
  ],
  roofing: [
    { name: "ガルバリウム鋼板 立平葺", unit: "㎡", unitPrice: 6800, supplier: "丸八建材店" },
    { name: "改質アスファルトルーフィング", unit: "巻", unitPrice: 11500, supplier: "丸八建材店" },
    { name: "棟板金", unit: "本", unitPrice: 4200, supplier: "丸八建材店" },
    { name: "雨樋 φ105", unit: "本", unitPrice: 3600, supplier: "丸八建材店" },
  ],
  other: [
    { name: "防犯カメラ 屋外用", unit: "台", unitPrice: 48000, supplier: "株式会社関東電材" },
    { name: "LANケーブル Cat6", unit: "m", unitPrice: 120, supplier: "株式会社関東電材" },
    { name: "雑材一式", unit: "式", unitPrice: 25000, supplier: "東邦設備資材株式会社" },
  ],
};

export const OUTSOURCING_VENDORS: Record<ConstructionType, ReadonlyArray<{ vendor: string; description: string }>> = {
  electrical: [
    { vendor: "有限会社佐野電気工事", description: "幹線・照明工事 応援（作業員派遣）" },
    { vendor: "株式会社ライトアップ電設", description: "高所照明器具取付 応援" },
  ],
  hvac: [
    { vendor: "株式会社エアテック工業", description: "室内機吊込み・冷媒配管 応援" },
    { vendor: "三栄クレーン株式会社", description: "室外機揚重（ラフタークレーン）" },
  ],
  plumbing: [
    { vendor: "有限会社藤井管工", description: "給排水配管工事 応援" },
    { vendor: "株式会社クリーン解体", description: "既設設備撤去・産廃運搬" },
  ],
  renovation: [
    { vendor: "株式会社クリーン解体", description: "解体・撤去工事" },
    { vendor: "内装工房カネコ", description: "内装仕上げ（クロス・床）" },
  ],
  painting: [
    { vendor: "有限会社藤田塗装", description: "外壁塗装工事一式" },
    { vendor: "株式会社関東足場", description: "仮設足場 組立・解体" },
  ],
  roofing: [
    { vendor: "有限会社屋根の匠", description: "屋根葺き工事" },
    { vendor: "株式会社関東足場", description: "仮設足場 組立・解体" },
  ],
  other: [{ vendor: "有限会社佐野電気工事", description: "設備工事 応援" }],
};

/** 工種ごとの原価構成比（労務費 / 材料費 / 外注費）の目安 */
export const COST_STRUCTURE: Record<ConstructionType, { labor: number; material: number; outsourcing: number }> = {
  electrical: { labor: 0.36, material: 0.46, outsourcing: 0.18 },
  hvac: { labor: 0.26, material: 0.56, outsourcing: 0.18 },
  plumbing: { labor: 0.36, material: 0.42, outsourcing: 0.22 },
  renovation: { labor: 0.22, material: 0.43, outsourcing: 0.35 },
  painting: { labor: 0.3, material: 0.18, outsourcing: 0.52 },
  roofing: { labor: 0.26, material: 0.42, outsourcing: 0.32 },
  other: { labor: 0.35, material: 0.45, outsourcing: 0.2 },
};

export const EXPENSE_MEMOS: Record<ExpenseCategory, readonly string[]> = {
  parking: ["コインパーキング 5日分", "現場近隣駐車場 1週間分", "月極駐車場（現場用）"],
  highway: ["首都高 往復", "資材引取り 高速代", "湾岸線 往復"],
  fuel: ["社用車 給油", "トラック 軽油", "発電機用 燃料"],
  heavy_equipment: ["高所作業車 レンタル 1日", "高所作業車 レンタル 2日", "ミニユンボ レンタル"],
  rental: ["発電機・投光器 レンタル", "仮設トイレ レンタル", "コア抜き機 レンタル"],
  waste_disposal: ["産業廃棄物処分（混合）", "既設機器 処分費", "廃材 運搬・処分"],
  other: ["消耗品 購入", "近隣挨拶 粗品"],
};

/** 日報の作業内容テンプレート（工程順） */
export const WORK_STEPS: Record<ConstructionType, readonly string[]> = {
  electrical: [
    "現地調査・墨出し、資材搬入",
    "既設照明器具・配線の撤去",
    "ケーブルラック・配管の取付",
    "幹線ケーブル敷設",
    "分電盤の設置・結線",
    "照明器具の取付・結線",
    "コンセント・スイッチ類の取付",
    "絶縁抵抗測定・通電試験",
    "竣工検査対応・清掃・引渡し準備",
  ],
  hvac: [
    "既設室内機・室外機の撤去、冷媒回収",
    "冷媒配管・ドレン配管の施工",
    "室内機の吊り込み・設置",
    "室外機の据付（架台設置）",
    "電源工事・制御配線",
    "気密試験・真空引き",
    "試運転調整",
    "竣工検査・取扱説明",
  ],
  plumbing: [
    "既設配管の撤去・養生",
    "給水管（HIVP）配管施工",
    "排水管（VP）勾配確認・接続",
    "水圧試験",
    "器具取付・通水確認",
    "保温工事・仕上げ確認",
  ],
  renovation: [
    "解体・撤去作業、養生",
    "下地補修・配管移設",
    "設備機器の組立・設置（メーカー施工立会い）",
    "内装仕上げ（クロス・床）",
    "器具取付・クリーニング",
    "施主様立会い検査・引渡し",
  ],
  painting: [
    "足場組立（協力会社）・飛散防止ネット設置",
    "高圧洗浄",
    "下地補修・ケレン・コーキング打替え",
    "下塗り",
    "中塗り",
    "上塗り",
    "検査・手直し・足場解体",
  ],
  roofing: [
    "足場組立・既存屋根の調査",
    "既存棟板金の撤去",
    "防水ルーフィング敷設",
    "ガルバリウム鋼板葺き",
    "棟・ケラバ板金取付",
    "雨樋交換・最終検査",
  ],
  other: ["現地調査・準備", "機器設置", "配線・接続", "動作確認・引渡し"],
};

export const ISSUE_TEMPLATES: readonly string[] = [
  "既設配管の腐食が想定以上。交換範囲の拡大について施主と協議予定。",
  "雨天のため午後の屋外作業を中止し、屋内作業に切り替え。",
  "資材の納品が1日遅延。工程を入れ替えて対応。",
  "既設図面と現況配線が相違。追加配線が必要（見積提出予定）。",
  "近隣から作業音について問い合わせあり。作業時間を再周知した。",
  "高所作業車の手配が翌日にずれ込み。",
  "テナント営業との調整が必要。作業時間を夜間に変更する可能性あり。",
];

export const NOTE_TEMPLATES: readonly string[] = [
  "朝礼・KY活動実施。ヒヤリハットなし。",
  "施主様へ進捗を口頭で報告済み。",
  "元請担当者の現場巡回あり。指摘事項なし。",
  "使用工具の点検を実施。",
];

/** 祝日相当として休業する日（MM-DD） */
export const COMPANY_HOLIDAYS: readonly string[] = [
  "12-29", "12-30", "12-31", "01-01", "01-02", "01-03",
  "05-03", "05-04", "05-05", "05-06",
  "08-13", "08-14", "08-15", "08-16",
];

/** 現場写真のサンプル画像（public/demo-photos 配下） */
export const SAMPLE_PHOTOS = {
  ceilingBefore: "ceiling-before.svg",
  ceilingDuring: "ceiling-during.svg",
  ceilingAfter: "ceiling-after.svg",
  hvacBefore: "hvac-before.svg",
  hvacDuring: "hvac-during.svg",
  hvacAfter: "hvac-after.svg",
  pipeBefore: "pipe-before.svg",
  pipeDuring: "pipe-during.svg",
} as const;
