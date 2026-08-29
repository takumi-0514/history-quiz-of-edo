const fs = require('fs');

let content = fs.readFileSync('data.js', 'utf8');

// A helper function to split events and generate new objects
function processDatabaseText(dbText) {
    // 雑な正規表現でオブジェクトのリストを取り出すのは危ないので、
    // " / " や "／" を含む行を見つけて置換するアプローチを取る
    // 複雑になるので、node.js で直接文字列置換を行う
    return dbText;
}

// とりあえず愚直に置換リストを作って置換していく
const replacements = [
    // 日本史
    {
        from: /\{ id: "jp_1615", year: 1615, event: "大坂夏の陣 \/ 武家諸法度が定められる".*?\},/,
        to: `{ id: "jp_1615a", year: 1615, event: "大坂夏の陣", tags: ["battle"], description: "豊臣氏が滅亡し、戦国時代が完全に終わりました。" },\n            { id: "jp_1615b", year: 1615, event: "武家諸法度が定められる", tags: ["law"], description: "幕府が大名を厳しくコントロールするための法律を定めました。" },`
    },
    {
        from: /\{ id: "jp_1858", year: 1858, event: "日米修好通商条約を結ぶ \/ 安政の大獄".*?\},/,
        to: `{ id: "jp_1858a", year: 1858, event: "日米修好通商条約を結ぶ", tags: ["treaty", "foreign", "bakumatsu"], description: "大老の井伊直弼が、天皇の許可を得ずにアメリカと結んだ不平等な条約です。" },\n            { id: "jp_1858b", year: 1858, event: "安政の大獄", tags: ["incident", "bakumatsu"], description: "日米修好通商条約に反対した吉田松陰などの大勢の武士や公家を、井伊直弼が処刑しました。" },`
    },
    {
        from: /\{ id: "jp_1867", year: 1867, event: "大政奉還 \/ 王政復古の大号令".*?\},/,
        to: `{ id: "jp_1867a", year: 1867, event: "大政奉還", tags: ["politics", "bakumatsu"], description: "15代将軍徳川慶喜が、政権（国を治める権利）を天皇に返上しました。これによって鎌倉時代から約700年続いた武士の政治が幕を閉じました。" },\n            { id: "jp_1867b", year: 1867, event: "王政復古の大号令", tags: ["politics", "bakumatsu"], description: "天皇中心の新しい政治体制を作ることを宣言しました。" },`
    },
    {
        from: /\{ id: "jp_1868", year: 1868, event: "戊辰戦争 \/ 五箇条の御誓文".*?\},/,
        to: `{ id: "jp_1868a", year: 1868, event: "戊辰戦争", tags: ["battle", "bakumatsu"], description: "新政府軍と旧幕府軍の間で国内最大の内戦が始まりました。" },\n            { id: "jp_1868b", year: 1868, event: "五箇条の御誓文", tags: ["politics", "bakumatsu"], description: "明治天皇は新政府の新しい国づくりの基本方針として発表しました。" },`
    },
    {
        from: /\{ id: "jp_1869", year: 1869, event: "版籍奉還 \/ 蝦夷地を北海道と改称".*?\},/,
        to: `{ id: "jp_1869a", year: 1869, event: "版籍奉還", tags: ["reform", "politics", "meiji"], description: "大名たちから、土地（版）と人民（籍）を明治天皇に返還させ、国のコントロール下に置しました。" },\n            { id: "jp_1869b", year: 1869, event: "蝦夷地を北海道と改称", tags: ["reform", "meiji"], description: "蝦夷地と呼ばれていた場所が「北海道」と改められました。" },`
    },
    {
        from: /\{ id: "jp_1871", year: 1871, event: "廃藩置県 \/ 解放令 \/ 岩倉使節団の派遣".*?\},/,
        to: `{ id: "jp_1871a", year: 1871, event: "廃藩置県", tags: ["reform", "politics", "meiji"], description: "これまでの「藩」をすべて無くして「県」を置き、東京から新しい知事を送って中央集権化を進めました。" },\n            { id: "jp_1871b", year: 1871, event: "解放令", tags: ["reform", "law", "meiji"], description: "差別されていた人々を平民とする「解放令」が出されました。" },\n            { id: "jp_1871c", year: 1871, event: "岩倉使節団の派遣", tags: ["foreign", "meiji"], description: "岩倉具視を大使とする使節団が欧米へ派遣されました。" },`
    },
    {
        from: /\{ id: "jp_1873", year: 1873, event: "徴兵令 \/ 地租改正".*?\},/,
        to: `{ id: "jp_1873a", year: 1873, event: "徴兵令", tags: ["reform", "law", "meiji"], description: "20歳になった男子に軍隊へ行く義務を課しました。" },\n            { id: "jp_1873b", year: 1873, event: "地租改正", tags: ["reform", "law", "meiji"], description: "土地の値段（地価）の3%を現金で政府に納めさせる、明治維新の超重要改革です。" },`
    },
    {
        from: /\{ id: "jp_1890", year: 1890, event: "第一回帝国議会 \/ 教育勅語の発布".*?\},/,
        to: `{ id: "jp_1890a", year: 1890, event: "第一回帝国議会", tags: ["politics", "meiji"], description: "憲法ができたことによって、日本で初めての国会（帝国議会）が開かれました。" },\n            { id: "jp_1890b", year: 1890, event: "教育勅語の発布", tags: ["law", "meiji"], description: "学校などで道徳の基本とされた「教育勅語」が出されました。" },`
    },
    {
        from: /\{ id: "jp_1894", year: 1894, event: "条約改正（治外法権の撤廃） \/ 日清戦争".*?\},/,
        to: `{ id: "jp_1894a", year: 1894, event: "条約改正（治外法権の撤廃）", tags: ["treaty", "foreign"], description: "陸奥宗光の交渉によって、イギリスなどの国々と結んでいた不平等条約の治外法権（領事裁判権）が撤廃されました。" },\n            { id: "jp_1894b", year: 1894, event: "日清戦争", tags: ["battle", "foreign"], description: "朝鮮の支配をめぐって、日本と清の間で起こった戦争です。日本が勝利しました。" },`
    },
    {
        from: /\{ id: "jp_1895", year: 1895, event: "下関条約 \/ 三国干渉".*?\},/,
        to: `{ id: "jp_1895a", year: 1895, event: "下関条約", tags: ["treaty", "foreign", "meiji"], description: "日清戦争に大勝利した日本は、清と下関条約を結び、多額の賠償金や遼東半島・台湾を譲り受けました。" },\n            { id: "jp_1895b", year: 1895, event: "三国干渉", tags: ["foreign", "meiji"], description: "ロシア、ドイツ、フランスから「遼東半島を清に返しなさい」と三国干渉を受けました。" },`
    },
    {
        from: /\{ id: "jp_1910", year: 1910, event: "大逆事件 \/ 韓国を併合する".*?\},/,
        to: `{ id: "jp_1910a", year: 1910, event: "大逆事件", tags: ["incident", "politics"], description: "明治天皇を暗殺しようとしたとして幸徳秋水ら社会主義者が処刑されました。" },\n            { id: "jp_1910b", year: 1910, event: "韓国併合", tags: ["politics", "foreign"], description: "韓国を完全に日本の領土としました。" },`
    },
    {
        from: /\{ id: "jp_1945c", year: 1945, event: "財閥解体が始まる／女性参政権が実現する".*?\},/,
        to: `{ id: "jp_1945c", year: 1945, event: "財閥解体が始まる", tags: ["reform"], description: "GHQの占領政策により、経済を支配してきた財閥の解体が進められました。" },\n            { id: "jp_1945d", year: 1945, event: "女性参政権が実現する", tags: ["law", "politics"], description: "女性にも参政権が認められ、翌年の総選挙で初めて女性議員が誕生しました。" },`
    },
    // 世界史
    {
        from: /\{ id: "wd_1861", year: 1861, event: "アメリカの南北戦争が始まる \/ ロシアで農奴解放令が出される".*?\},/,
        to: `{ id: "wd_1861a", year: 1861, event: "アメリカの南北戦争が始まる", tags: ["battle"], description: "【1861年〜1865年】アメリカでは奴隷制や貿易を巡り「北部」と「南部」に分かれて猛烈な内戦が勃発しました。" },\n            { id: "wd_1861b", year: 1861, event: "ロシアで農奴解放令が出される", tags: ["law", "reform"], description: "皇帝が遅れていた国を近代化するため、地主に縛られていた農民を自由にする「農奴解放令」を出しました。" },`
    },
    {
        from: /\{ id: "wd_1870", year: 1870, event: "プロイセン・フランス戦争が起こる \/ イタリアが統一される".*?\},/,
        to: `{ id: "wd_1870a", year: 1870, event: "プロイセン・フランス戦争が起こる", tags: ["battle"], description: "【1870年〜1871年】ドイツをまとめたいプロイセン（ビスマルク首相）が、フランスのナポレオン3世と戦って勝利した戦争です。" },\n            { id: "wd_1870b", year: 1870, event: "イタリアが統一される", tags: ["politics"], description: "同じ混乱期に、イタリアも完全統一を成し遂げました。" },`
    },
    {
        from: /\{ id: "wd_1919a", year: 1919, event: "ベルサイユ条約が結ばれる \/ ドイツのワイマール憲法".*?\},/,
        to: `{ id: "wd_1919a_1", year: 1919, event: "ベルサイユ条約が結ばれる", tags: ["treaty"], description: "第一次世界大戦の講和条約が結ばれ、ドイツに巨額の賠償金が課されました。" },\n            { id: "wd_1919a_2", year: 1919, event: "ドイツでワイマール憲法が制定される", tags: ["law"], description: "ドイツでは当時最も民主的なワイマール憲法が制定されました。" },`
    },
    {
        from: /\{ id: "wd_1919b", year: 1919, event: "朝鮮で三・一独立運動、中国で五・四運動".*?\},/,
        to: `{ id: "wd_1919b_1", year: 1919, event: "朝鮮で三・一独立運動が起こる", tags: ["incident", "politics"], description: "日本の植民地支配に反対する独立運動が朝鮮半島で起きました。" },\n            { id: "wd_1919b_2", year: 1919, event: "中国で五・四運動が起こる", tags: ["incident", "politics"], description: "日本の帝国主義的な進出に反対する運動が中国で起きました。" },`
    },
    {
        from: /\{ id: "wd_1941", year: 1941, event: "ドイツのソ連侵攻 \/ 大西洋憲章の発表".*?\},/,
        to: `{ id: "wd_1941a", year: 1941, event: "ドイツのソ連侵攻", tags: ["battle", "foreign"], description: "ドイツが独ソ不可侵条約を破ってソ連に侵攻しました。" },\n            { id: "wd_1941b", year: 1941, event: "大西洋憲章の発表", tags: ["foreign"], description: "米英首脳が戦後の平和構想である大西洋憲章を発表しました。" },`
    },
    {
        from: /\{ id: "wd_1945b", year: 1945, event: "ドイツの降伏 \/ ポツダム会談".*?\},/,
        to: `{ id: "wd_1945b_1", year: 1945, event: "ドイツの降伏", tags: ["battle", "foreign"], description: "ソ連軍のベルリン陥落によりドイツが無条件降伏しました。" },\n            { id: "wd_1945b_2", year: 1945, event: "ポツダム会談", tags: ["foreign", "politics"], description: "米英ソの首脳がポツダムに集まり戦後処理を話し合いました。" },`
    }
];

replacements.forEach(rep => {
    content = content.replace(rep.from, rep.to);
});

fs.writeFileSync('data.js', content, 'utf8');
console.log("data.js has been updated.");
