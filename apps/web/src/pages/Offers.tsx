import { useResource, type Row } from '../api';
import { useApp } from '../context';
import { PageTitle, Skeleton, ErrorView, Empty } from '../components/ui';
import { OfferCard } from '../components/OfferCard';
export default function Offers(){const {version}=useApp(),{data,error,reload}=useResource<Row[]>('/offers',version);return <><PageTitle title="Хочешь выпить?" description="Места для встречи после игры."/>{error?<ErrorView message={error} retry={reload}/>:!data?<Skeleton/>:!data.length?<Empty title="Скоро здесь будут наши места" text="Клуб готовит предложения для игроков."/>:<div className="venues-grid">{data.map(o=><OfferCard key={o.id} offer={o}/>)}</div>}</>;}
