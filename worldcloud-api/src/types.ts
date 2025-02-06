import { Word } from 'd3-cloud';

export type WordItem = [string, number];

export interface CloudOptions {
    width: number;
    height: number;
    padding: number;
    font: string;
    colors: string[];
}
