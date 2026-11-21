import './globals.css';
export const metadata = { title: '오름한끼 · 제주 동쪽 오름과 마을여행', description: '오름 정상에서 바라본 풍경을 따라, 제주 동쪽 마을의 밥상과 바다를 만나는 여행.' };
export const viewport = {width:'device-width',initialScale:1,themeColor:'#faf9f6'};
export default function RootLayout({children}) {
  return <html lang="ko" suppressHydrationWarning><body>{children}</body></html>;
}
