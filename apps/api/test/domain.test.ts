import { describe, expect, it } from 'vitest';
import { elo, league } from '../src/domain/rating.js';
import { achievementEligible, weightedRarity } from '../src/domain/economy.js';
describe('rating rules',()=>{it('calculates Elo',()=>{expect(elo(1000,1000,30,true)).toBe(12);expect(elo(1000,1000,30,false)).toBe(-12)});it('maps leagues',()=>{expect(league(1284)).toBe('GOLD');expect(league(1800)).toBe('MASTER')})});
describe('economy rules',()=>{it('uses weighted rarity',()=>{expect(weightedRarity({COMMON:70,RARE:30},0)).toBe('COMMON');expect(weightedRarity({COMMON:70,RARE:30},.7)).toBe('RARE')});it('checks achievements',()=>{expect(achievementEligible({metric:'wins',threshold:5},{wins:5})).toBe(true);expect(achievementEligible({metric:'wins',threshold:5},{wins:4})).toBe(false)})});
