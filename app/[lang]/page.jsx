import {notFound} from 'next/navigation';
import TravelApp from '../components/TravelApp';
const languages=['ko','en','ja','zh-Hans','zh-Hant'];
export function generateStaticParams(){return languages.map(lang=>({lang}));}
export default async function LocalizedPage({params}){
 const {lang}=await params;
 if(!languages.includes(lang))notFound();
 return <TravelApp initialLang={({ 'zh-Hans':'zh','zh-Hant':'tw' })[lang] || lang} />;
}
