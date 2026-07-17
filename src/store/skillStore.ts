import { create } from 'zustand';
import { Skill } from '../types';

interface SkillState {
  skills: Skill[];
  setSkills: (skills: Skill[]) => void;
  addSkill: (skill: Skill) => void;
}

export const useSkillStore = create<SkillState>((set) => ({
  skills: [],
  setSkills: (skills) => set({ skills }),
  addSkill: (skill) => set((state) => ({ skills: [skill, ...state.skills] })),
}));
