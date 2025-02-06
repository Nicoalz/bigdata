import { createCanvas, Canvas, CanvasRenderingContext2D as NodeCanvasRenderingContext2D } from 'canvas';
import cloud from 'd3-cloud';
import PDFDocument from 'pdfkit';
import { CloudOptions, WordItem } from './types';
import { Word } from 'd3-cloud';

import { registerFont } from 'canvas';

registerFont('/opt/etc/fonts/Helvetica.ttf', { family: 'Helvetica' });


declare module 'canvas' {
    interface Canvas {
        style?: CSSStyleDeclaration;
    }
}

type CustomCanvasContext = NodeCanvasRenderingContext2D & {
    getContextAttributes?: () => any;
    isPointInStroke?: (x: number, y: number) => boolean;
    createConicGradient?: (startAngle: number, x: number, y: number) => any;
    filter?: string;
};

export class WordCloudGenerator {
  private canvas: Canvas;
  private ctx: CustomCanvasContext;
  private options: CloudOptions;

  constructor() {
      this.canvas = createCanvas(1200, 800);
      this.canvas.style = {} as CSSStyleDeclaration;
      
      const context = this.canvas.getContext('2d');
      this.ctx = context as CustomCanvasContext;
      
      this.ctx.getContextAttributes = () => ({});
      this.ctx.isPointInStroke = () => false;
      this.ctx.createConicGradient = (startAngle: number, x: number, y: number) => ({
          addColorStop: () => {}
      });
      this.ctx.filter = 'none';

      this.options = {
          width: 1200,
          height: 800,
          padding: 3,
          font: 'Helvetica',
          colors: ['#2B3674', '#475099', '#6369BE', '#7F82E2']
      };
  }

  private calculateLevenshteinDistance(a: string, b: string): number {
      if (a.length === 0) return b.length;
      if (b.length === 0) return a.length;

      const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

      for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
      for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

      for (let j = 1; j <= b.length; j++) {
          for (let i = 1; i <= a.length; i++) {
              const cost = a[i - 1] === b[j - 1] ? 0 : 1;
              matrix[j][i] = Math.min(
                  matrix[j - 1][i] + 1,
                  matrix[j][i - 1] + 1,
                  matrix[j - 1][i - 1] + cost
              );
          }
      }

      return matrix[b.length][a.length];
  }

  private calculateSimilarity(str1: string, str2: string): number {
      const maxLength = Math.max(str1.length, str2.length);
      const distance = this.calculateLevenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
      return (maxLength - distance) / maxLength;
  }

  private normalizeWords(words: WordItem[]): WordItem[] {
      const similarityThreshold = 0.8; 
      const wordGroups = new Map<string, { totalWeight: number; variants: string[] }>();

      words.forEach(([word, weight]) => {
          const normalizedWord = word.toLowerCase().trim();
          
          let found = false;
          for (const [groupWord, group] of wordGroups.entries()) {
              if (this.calculateSimilarity(normalizedWord, groupWord) >= similarityThreshold) {
                  group.totalWeight += weight;
                  group.variants.push(normalizedWord);
                  found = true;
                  break;
              }
          }

          if (!found) {
              wordGroups.set(normalizedWord, {
                  totalWeight: weight,
                  variants: [normalizedWord]
              });
          }
      });

      return Array.from(wordGroups.entries()).map(([word, { totalWeight, variants }]) => {
          const mostCommonVariant = variants.reduce((a, b) =>
              variants.filter(v => v === a).length >= variants.filter(v => v === b).length ? a : b
          );
          
          const finalWord = mostCommonVariant.charAt(0).toUpperCase() + mostCommonVariant.slice(1);
          return [finalWord, totalWeight] as WordItem;
      });
  }

  private convertToD3Words(words: WordItem[]): Partial<Word>[] {
      const normalizedWords = this.normalizeWords(words);
      const maxWeight = Math.max(...normalizedWords.map(w => w[1]));
      
      return normalizedWords.map(w => ({
          text: w[0],
          size: 20 + (w[1] / maxWeight) * 60,
          padding: this.options.padding
      }));
  }

  async generateWordCloud(words:WordItem[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        try {
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            
            const layout = cloud()
                .size([this.options.width, this.options.height])
                .words(this.convertToD3Words(words))
                .padding(this.options.padding)
                .rotate(() => 0)
                .spiral('rectangular')
                .font('Helvetica')
                .fontSize(d => d.size || 0)
                .canvas(() => this.canvas as unknown as HTMLCanvasElement)
                .on('end', (words: Word[]) => {
                    try {
                        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
                        this.ctx.clearRect(0, 0, this.options.width, this.options.height);
                      
                        this.ctx.fillStyle = 'white';
                        this.ctx.fillRect(0, 0, this.options.width, this.options.height);
                        
                        this.ctx.save();
                        
                        this.ctx.translate(this.options.width / 2, this.options.height / 2);
                        
                        words.forEach((word, i) => {
                            const color = this.options.colors[i % this.options.colors.length];
                            this.ctx.fillStyle = color;
                            this.ctx.font = `${word.size}px ${this.options.font}`;
                            this.ctx.textAlign = 'center';
                            this.ctx.fillText(word.text || '', word.x || 0, word.y || 0);
                        });
                        
                        this.ctx.restore();
                        
                        resolve(this.canvas.toBuffer('image/png'));
                    } catch (error) {
                        reject(error);
                    }
                });

            layout.start();
        } catch (error) {
            reject(error);
        }
    });
}

//   async createPDF(imageBuffer: Buffer): Promise<void> {
//       const doc = new PDFDocument({
//           size: [this.options.width, this.options.height]
//       });

//       const outputPath = './word-cloud.pdf';
//       doc.pipe(fs.createWriteStream(outputPath));

//       doc.image(imageBuffer, 0, 0, {
//           width: this.options.width,
//           height: this.options.height
//       });

//       doc.end();
//       console.log(`PDF created successfully: ${outputPath}`);
//   }

async createPDF(imageBuffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: [this.options.width, this.options.height]
        });

        const chunks: Buffer[] = [];
        doc.on('data', chunk => chunks.push(chunk)); // Collect chunks in memory
        doc.on('end', () => resolve(Buffer.concat(chunks))); // Resolve with final buffer
        doc.on('error', reject);

        doc.font('Helvetica') // Register the font

        doc.image(imageBuffer, 0, 0, {
            width: this.options.width,
            height: this.options.height
        });

        doc.end();
    });
}


async generatePDF(words: WordItem[]): Promise<Buffer> {
    try {
        const imageBuffer = await this.generateWordCloud(words);
        return await this.createPDF(imageBuffer);
    } catch (error) {
        console.error('Error during generation:', error);
        throw error;
    }
}

}