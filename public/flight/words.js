const fields = [
  'terrain','glide','photo','back','places','save','saved','go','pause','start','turnLeft','turnRight','summit','preview','visited','verify','noCheck','radius','edge','hint','photoHint','empty','unsupported','loading','err','retry','credits','alt','near','close','saveFail','checkFail','peak','meal','cafe','stay','experience','attraction','sea','photoNote','legend','drag','data','reset','boundary','glideHint','distance',
];
const languages = {
  ko: [
    '정상 조망','윙슈트','항공 사진','돌아가기','주변 장소','여행에 저장','저장됨','이쪽 보기','일시정지','비행 시작','왼쪽으로','오른쪽으로','정상으로','미리보기','방문 인증','현장에서 방문 인증','가상 조망 지점','비행 반경','비행 경계에 닿았어요. 방향을 돌려보세요.','화면을 끌어 주변 오름을 둘러보세요.','화면을 끌어 360° 항공 사진을 둘러보세요.','이 반경에 등록된 장소가 아직 없어요.','이 오름은 정상 조망을 준비 중이에요.','제주 동부 지형을 불러오는 중','지형을 불러오지 못했어요.','다시 시도','지형·사진 출처','고도','주변','닫기','저장하지 못했어요. 다시 시도해 주세요.','방문 인증을 완료하지 못했어요.','오름','오름 한끼','오름 한잔','오름 푹잠','마을 체험','관광지','바다','제주특별자치도 · 2021년 항공 촬영','지형 조망','드래그로 둘러보기','자료 출처','초기 방향','이용 범위','방향을 돌리고 비행 시작을 눌러보세요.','정상에서',
  ],
  en: [
    'Summit view','Wingsuit','Aerial photo','Go back','Nearby places','Save to trip','Saved','Look this way','Pause','Start flight','Turn left','Turn right','Return to summit','Preview','Visit verified','Check in on site','Virtual viewpoint','Flight radius','At the edge. Turn to continue flying.','Drag to look around and identify nearby peaks.','Drag to explore the 360° aerial photograph.','No listed places in this radius yet.','A summit view is being prepared for this oreum.','Loading East Jeju terrain','The terrain could not be loaded.','Try again','Terrain & photo credits','Elevation','Nearby','Close','Could not save. Please try again.','Check-in was not completed.','Oreum','Eat','Drink','Stay','Village experience','Attraction','Sea','Jeju Province · photographed in 2021','Terrain view','Drag to look around','Credits','Reset view','Range','Turn to choose a direction, then start flying.','From summit',
  ],
  ja: [
    '山頂の眺め','ウイングスーツ','空撮写真','戻る','周辺のスポット','旅に保存','保存済み','この方向を見る','一時停止','飛行を開始','左へ','右へ','山頂に戻る','プレビュー','訪問確認済み','現地でチェックイン','仮想展望地点','飛行半径','境界です。方向を変えてください。','画面をドラッグして周囲のオルムを眺めましょう。','ドラッグして360°の空撮写真を見ましょう。','この範囲に登録されたスポットはまだありません。','このオルムの展望は準備中です。','済州東部の地形を読み込み中','地形を読み込めませんでした。','再試行','地形・写真の出典','標高','周辺','閉じる','保存できませんでした。もう一度お試しください。','チェックインを完了できませんでした。','オルム','食事','カフェ','宿泊','村の体験','観光','海','済州特別自治道 · 2021年空撮','地形展望','ドラッグで見渡す','出典','初期方向','範囲','方向を選んで飛行を開始しましょう。','山頂から',
  ],
  zh: [
    '山顶眺望','翼装飞行','航拍照片','返回','附近地点','保存到行程','已保存','朝这里看','暂停','开始飞行','向左','向右','返回山顶','预览','已验证到访','现场签到','虚拟观景点','飞行半径','已到达边界，请转向继续飞行。','拖动屏幕，看看周围的火山丘。','拖动查看360°航拍照片。','此范围内暂无收录地点。','此火山丘的山顶景观正在筹备中。','正在载入济州东部地形','未能载入地形。','重试','地形与照片来源','海拔','周边','关闭','未能保存，请重试。','未完成签到。','火山丘','餐厅','咖啡馆','住宿','村庄体验','景点','海岸','济州特别自治道 · 2021年航拍','地形景观','拖动环顾四周','资料来源','初始方向','范围','选择方向，然后开始飞行。','距山顶',
  ],
  tw: [
    '山頂眺望','翼裝飛行','空拍照片','返回','附近地點','儲存至行程','已儲存','朝這裡看','暫停','開始飛行','向左','向右','回到山頂','預覽','已驗證到訪','現場簽到','虛擬觀景點','飛行半徑','已抵達邊界，請轉向繼續飛行。','拖曳畫面，看看周圍的火山丘。','拖曳查看360°空拍照片。','此範圍內尚無收錄地點。','這座火山丘的山頂景觀正在籌備中。','正在載入濟州東部地形','無法載入地形。','重試','地形與照片來源','海拔','周邊','關閉','無法儲存，請重試。','未完成簽到。','火山丘','餐廳','咖啡館','住宿','村莊體驗','景點','海岸','濟州特別自治道 · 2021年空拍','地形景觀','拖曳環顧四周','資料來源','初始方向','範圍','選擇方向，然後開始飛行。','距山頂',
  ],
};

export function flightLanguage(locale = 'ko') {
  const name = locale.toLowerCase();
  return name === 'tw' || /zh-(tw|hk|hant)/.test(name) ? 'tw' : languages[name.slice(0, 2)] ? name.slice(0, 2) : 'en';
}
export function flightWords(locale) {
  return Object.fromEntries(fields.map((key, i) => [key, languages[locale][i]]));
}
