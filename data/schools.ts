import samples from './schools.json';
export type School = { id: string; name: string; region: string };
export interface SchoolRepository {
  search(query: string): Promise<School[]>;
  get(id: string): Promise<School | undefined>;
}
export class SampleSchoolRepository implements SchoolRepository {
  async search(q: string) {
    return samples.filter((s) => (s.name + s.region).includes(q));
  }
  async get(id: string) {
    return samples.find((s) => s.id === id);
  }
}
export const schools = samples;
export const regions = [
  '서울',
  '부산',
  '대구',
  '인천',
  '광주',
  '대전',
  '울산',
  '세종',
  '경기',
  '강원',
  '충북',
  '충남',
  '전북',
  '전남',
  '경북',
  '경남',
  '제주',
];
