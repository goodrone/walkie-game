import React from 'react';
import { Walkie, levels } from '../App.js';

export default {
  title: 'Levels',
};

export const win = () => <Walkie startLevel={levels.win(null)}/>;
export const level1 = () => <Walkie startLevel={levels.t1}/>;
export const level2 = () => <Walkie startLevel={levels.t2}/>;
export const level3 = () => <Walkie startLevel={levels.t3}/>;
export const level4 = () => <Walkie startLevel={levels.t4}/>;
export const level5 = () => <Walkie startLevel={levels.t5}/>;
export const level6 = () => <Walkie startLevel={levels.t6}/>;
export const level7 = () => <Walkie startLevel={levels.t7}/>;
export const level8 = () => <Walkie startLevel={levels.t8}/>;
