import { Injectable, InternalServerErrorException } from '@nestjs/common';
import nodeHtmlToImage from 'node-html-to-image';

export type WikiTheme = 'light' | 'dark';

interface WikiPostData {
  title: string;
  extract_html: string;
  theme?: WikiTheme;
}

@Injectable()
export class ImageGeneratorService {
  async generatePostImage(data: WikiPostData): Promise<Buffer> {
    try {
      const theme = data.theme || 'light';

      // LOGICA FONT
      const textLength = data.extract_html.replace(/<[^>]*>?/gm, '').length;
      let fontSize = '40px';
      if (textLength > 500) fontSize = '32px';

      // LOGICA COLORI (Semplificata: niente più sfondo canvas o ombre esterne)
      const colors =
        theme === 'dark'
          ? {
              cardBg: '#202122', // Scuro
              textMain: '#eaecf0', // Bianco sporco
              textTitle: '#ffffff', // Bianco puro
              border: '#a2a9b1', // Grigio bordo
            }
          : {
              cardBg: '#ffffff', // Bianco puro
              textMain: '#202122', // Nero fumo
              textTitle: '#000000', // Nero puro
              border: '#a2a9b1', // Grigio bordo
            };

      const htmlTemplate = `
      <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,700;1,400&family=Roboto:wght@400;500&display=swap');
            
            /* Reset base del body per evitare margini indesiderati */
            body {
              margin: 0;
              padding: 0;
              font-family: sans-serif;
              /* Nessun colore di sfondo, nessuna dimensione fissa qui */
            }

            /* LA CARD È ORA L'UNICO ELEMENTO CHE CONTA */
            .wiki-card {
              /* Larghezza fissa per mantenere l'aspetto da "popup" alta risoluzione */
              width: 800px; 
              /* L'altezza sarà automatica in base al contenuto */
              
              background-color: {{colors.cardBg}};
              color: {{colors.textMain}};
              border: 1px solid {{colors.border}};
              /* Wikipedia usa angoli leggermente stondati */
              border-radius: 2px; 
              
              /* Flex column per organizzare titolo e contenuto */
              display: flex;
              flex-direction: column;
              overflow: hidden;
              position: relative;
              padding-bottom: 40px; 
            }

            .content-container {
              padding: 50px 60px;
            }

            h1 {
              font-family: 'Noto Serif', 'Linux Libertine', 'Georgia', serif;
              font-weight: 400;
              font-size: 64px;
              margin: 0 0 25px 0;
              line-height: 1.1;
              color: {{colors.textTitle}};
            }

            .extract {
              font-family: 'Helvetica Neue', Helvetica, 'Roboto', Arial, sans-serif;
              color: {{colors.textMain}};
              line-height: 1.6;
            }

            .extract p { margin: 0; }
            
            .extract b, .extract strong {
              font-weight: 700;
              color: {{colors.textTitle}};
            }
          </style>
        </head>
        <body>
          <div class="wiki-card">
            <div class="content-container">
              <h1>{{title}}</h1>
              <div class="extract" style="font-size: {{fontSize}}">
                {{{extract_html}}}
              </div>
            </div>
          </div>
        </body>
      </html>
      `;

      const image = await nodeHtmlToImage({
        html: htmlTemplate,
        content: {
          title: data.title,
          extract_html: data.extract_html,
          fontSize: fontSize,
          colors: colors,
        },
        // 1. Ritaglia esattamente il div della card
        selector: '.wiki-card',

        // 2. Rende trasparente tutto ciò che è fuori (utile per gli angoli stondati)
        transparent: true,

        puppeteerArgs: {
          // 3. Qui lasciamo solo gli argomenti di Chrome
          args: ['--no-sandbox'],
        },
        type: 'png',
      });

      return image as Buffer;
    } catch (error) {
      console.error('Errore generazione immagine:', error);
      throw new InternalServerErrorException(
        'Errore nella generazione del post',
      );
    }
  }
}
