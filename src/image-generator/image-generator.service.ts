import { Injectable, InternalServerErrorException } from '@nestjs/common';
import nodeHtmlToImage from 'node-html-to-image';
import { getUserAgent } from '../common/utils/user-agent';

export type WikiTheme = 'light' | 'dark';

interface WikiPostData {
  title: string;
  extract_html: string;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  theme?: WikiTheme;
}

@Injectable()
export class ImageGeneratorService {
  private readonly userAgent = getUserAgent();

  async generatePostImage(data: WikiPostData): Promise<Buffer> {
    try {
      const theme = data.theme || 'light';

      const width = data.imageWidth || 0;
      const height = data.imageHeight || 0;
      // Landscape se larghezza > altezza
      const isLandscape = width > height;

      // Calcolo font size
      const textLength = data.extract_html.replace(/<[^>]*>?/gm, '').length;
      let fontSize = '34px';
      if (textLength > 400) fontSize = '26px';

      const colors =
        theme === 'dark'
          ? {
              cardBg: '#202122',
              textMain: '#eaecf0',
              textTitle: '#ffffff',
              border: '#a2a9b1',
            }
          : {
              cardBg: '#ffffff',
              textMain: '#202122',
              textTitle: '#000000',
              border: '#a2a9b1',
            };

      const htmlTemplate = `
      <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,700;1,400&family=Roboto:wght@400;500&display=swap');
            
            body { margin: 0; padding: 0; font-family: sans-serif; }

            .wiki-card {
              width: 850px;
              /* Se è landscape, l'altezza si adatta. Se è portrait, flex gestisce tutto. */
              background-color: {{colors.cardBg}};
              color: {{colors.textMain}};
              border: 1px solid {{colors.border}};
              border-radius: 3px;
              overflow: hidden;
              position: relative;
            }

            /* --- LAYOUT GENERALE --- */
            /* Usiamo Flexbox per affiancare testo e immagine verticale */
            .flex-container {
              display: flex;
              flex-direction: row; /* Riga: Testo a sx, Immagine a dx */
              width: 100%;
              /* Importante: stretch fa sì che l'immagine sia alta quanto il testo */
              align-items: stretch; 
            }

            .text-column {
              flex: 1; /* Prende tutto lo spazio disponibile */
              padding: 40px 50px;
              display: flex;
              flex-direction: column;
              justify-content: center; /* Centra verticalmente il testo se c'è spazio */
            }

            /* --- STILE PORTRAIT (Immagine Laterale "Split") --- */
            .img-col-portrait {
              width: 40%; /* L'immagine occupa il 40% della larghezza della card */
              flex-shrink: 0; /* Non si rimpicciolisce mai */
              
              /* TRUCCO CSS PER IMMAGINI DI COPERTINA PERFETTE */
              background-image: url('{{imageUrl}}');
              background-size: cover;    /* Ritaglia l'immagine per riempire il box */
              background-position: center; /* Centra il soggetto */
              background-repeat: no-repeat;
              
              border-left: 1px solid {{colors.border}}; /* Separatore sottile */
            }

            /* --- STILE LANDSCAPE (Banner in alto) --- */
            .img-landscape {
              width: 100%;
              height: 400px; 
              object-fit: cover;
              display: block;
              border-bottom: 1px solid {{colors.border}};
            }

            h1 {
              font-family: 'Noto Serif', 'Linux Libertine', 'Georgia', serif;
              font-weight: 400;
              font-size: 50px; /* Leggermente ridotto per stare bene nella colonna */
              margin: 0 0 20px 0;
              line-height: 1.1;
              color: {{colors.textTitle}};
            }

            .extract {
              font-family: 'Helvetica Neue', Helvetica, 'Roboto', Arial, sans-serif;
              color: {{colors.textMain}};
              line-height: 1.5;
            }
            .extract p { margin: 0; }
            .extract b, .extract strong { font-weight: 700; color: {{colors.textTitle}}; }
          </style>
        </head>
        <body>
          <div class="wiki-card">
            
            {{#if isLandscape}}
              {{#if imageUrl}}
                <img src="{{imageUrl}}" class="img-landscape" />
              {{/if}}
              <div class="text-column"> <h1>{{title}}</h1>
                 <div class="extract" style="font-size: {{fontSize}}">
                   {{{extract_html}}}
                 </div>
              </div>
            {{/if}}

            {{#unless isLandscape}}
              <div class="flex-container">
                
                <div class="text-column">
                  <h1>{{title}}</h1>
                  <div class="extract" style="font-size: {{fontSize}}">
                    {{{extract_html}}}
                  </div>
                </div>

                {{#if imageUrl}}
                  <div class="img-col-portrait"></div>
                {{/if}}
                
              </div>
            {{/unless}}

          </div>
        </body>
      </html>
      `;

      const image = await nodeHtmlToImage({
        html: htmlTemplate,
        content: {
          title: data.title,
          extract_html: data.extract_html,
          imageUrl: data.imageUrl,
          isLandscape: isLandscape,
          fontSize: fontSize,
          colors: colors,
        },
        selector: '.wiki-card',
        transparent: true,
        puppeteerArgs: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
          ],
          timeout: 60000,
        },
        beforeScreenshot: async (page) => {
          await page.setUserAgent(this.userAgent);
          await page.setExtraHTTPHeaders({
            'User-Agent': this.userAgent,
          });
        },
        type: 'png',
      });

      return image as Buffer;
    } catch (error) {
      console.error('Errore generazione:', error);
      throw new InternalServerErrorException('Errore generazione post');
    }
  }
}
