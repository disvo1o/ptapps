import { useParams } from 'react-router-dom';
import { useResource, type Row } from '../api';
import { useApp } from '../context';
import { PageTitle, Stat, Skeleton, ErrorView } from '../components/ui';
export function Statistics(){
 const {id}=useParams(),{me,version}=useApp();
 const {data,error,reload}=useResource<Row>(`/players/${id||me.id}/statistics`,version);
 if(error)return <ErrorView message={error} retry={reload}/>;
 if(!data)return <Skeleton/>;
 return <><PageTitle title="Статистика"/><div className="stats-grid three"><Stat label="Количество турниров" value={data.tournaments??0}/><Stat label="Победы" value={data.wins??0}/><Stat label="Победы в турнирах" value={data.tournament_wins??0}/></div></>;
}
