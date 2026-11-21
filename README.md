# 오름한끼 · Oreum Hankki

제주 동부 오름에서 산등성이를 둘러보고, 가상 윙슈트로 날아본 뒤, 내려가서 들를 식당·카페·숙소·마을 체험을 저장하는 여행 웹앱입니다. 조천·구좌·성산·표선·남원·우도를 다룹니다.

## 실행

Node.js 22 환경에서 `npm ci`와 `npm run dev`를 차례로 실행합니다. 한국어 첫 화면은 `http://localhost:3000/ko`입니다. 영문·일문·중문 간체·중문 번체는 `/en`, `/ja`, `/zh-Hans`, `/zh-Hant`에서 열립니다. 배포 빌드는 `npm run build`, 빌드 결과 실행은 `npm start`입니다. Vercel 프로젝트는 저장소 루트를 Next.js 프로젝트로 연결합니다.

## 여행 데이터와 화면

`app-data`에 여행 코스, 오름, 방문지를 담았습니다. `npm run catalog`는 저장소에 포함된 VisitJeju 스냅샷과 편집 데이터를 합쳐서 목록을 다시 만듭니다. `public/flight`에는 고도와 위성영상 기반 지형, 조망점, 현장 방문 지점이 들어 있습니다. 성산 식산봉과 표선 따라비오름에서는 실제 항공 파노라마도 둘러볼 수 있습니다. 홈 아래 **사진·자료 출처**와 비행 화면에서 사진과 지형 출처를 확인할 수 있습니다.

## 로그인과 현장 인증

기본 웹 앱은 `allquiz-f1e30` Firebase 프로젝트를 사용합니다. 프로젝트별 환경변수는 `.env.example`에 정리했습니다. Google 로그인을 운영하려면 Firebase Authentication에 Google 공급자와 실제 접속 도메인을 등록합니다. 게스트의 저장 목록은 현재 브라우저에 보관됩니다.

방문 기록 API는 Firebase ID 토큰과 방문 지점의 GPS를 검사합니다. 배포 환경에 해당 프로젝트의 Admin 자격 증명을 등록하고, 기존 프로젝트의 Firestore 규칙에 `firestore.rules`의 오름한끼 전용 경로를 병합합니다. 서비스 계정 비공개 키는 서버 환경에만 설정합니다.

## 비짓제주 데이터 갱신

비짓제주에서 발급한 키를 이 프로젝트의 `.env.local` 또는 실행 환경의 `VISITJEJU_API_KEY`에 설정하고, 저장소 루트에서 다음 명령을 실행합니다. [비짓제주 관광정보 Open API 신청과 활용 가이드](https://www.visitjeju.net/kr/visitJejuApi)

```sh
node scripts/refresh-visitjeju.mjs
```

갱신기는 한국어 목록의 모든 페이지를 순서대로 받아 페이지 수, 콘텐츠 ID, 6개 동부 권역 및 여행 분류를 검증합니다. 검증을 마치면 `east-places.js`와 `app-data/catalog.json`을 교체합니다. 호출 제한이나 데이터 오류로 중단되면 기존 파일을 유지합니다. 갱신 결과를 서비스에 반영하려면 변경 파일을 커밋하고 기존 방식으로 빌드·배포합니다. 평소 빌드와 페이지 열기는 저장된 데이터로 동작합니다.
