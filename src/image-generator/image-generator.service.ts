import { Injectable } from '@nestjs/common';
import nodeHtmlToImage from 'node-html-to-image';

interface WikiPostData {
  title: string;
  extract_html: string;
}

@Injectable()
export class ImageGeneratorService {
  async generatePostImage(data: WikiPostData): Promise<Buffer> {
    // Il template HTML/CSS per l'immagine
    // Usiamo tripla graffa {{{ }}} per l'HTML così mantiene i grassetti di Wikipedia
    const htmlTemplate = `
<html>
<head>
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap');
    
    body {
        width: 1080px;
        height: 1080px;
        margin: 0;
        padding: 0;
        background-color: #1a1a1a;
        color: white;
        font-family: 'Montserrat', sans-serif;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
    }

    .container {
        padding: 80px;
        border: 10px solid #fff;
        width: 800px;
        height: 800px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        background: linear-gradient(145deg, #1e1e1e, #2a2a2a);
        box-shadow: 20px 20px 60px #111, -20px -20px 60px #262626;
    }

    h1 {
        font-size: 60px;
        font-weight: 900;
        text-transform: uppercase;
        margin-bottom: 40px;
        color: #fca311; /* Un bel giallo/arancio */
        line-height: 1.2;
    }

    .content {
        font-size: 32px;
        line-height: 1.6;
        font-weight: 400;
    }

    /* Stili per l'HTML di Wikipedia */
    b, strong {
        color: #e5e5e5;
        font-weight: 700;
    }
    
    .footer {
        margin-top: 60px;
        font-size: 20px;
        opacity: 0.5;
        text-transform: uppercase;
        letter-spacing: 5px;
    }
    </style>
</head>
<body>
    <div class="container">
    <h1>{{title}}</h1>
    <div class="content">
        {{{extract_html}}} 
    </div>
    <div class="footer">WikiBot Daily</div>
    </div>
</body>
</html>
    `;

    // Generazione immagine
    const image = await nodeHtmlToImage({
      html: htmlTemplate,
      content: {
        title: data.title,
        extract_html: data.extract_html,
      },
      puppeteerArgs: { args: ['--no-sandbox'] }, // Necessario per Docker/Linux
      type: 'png',
      quality: 100,
      encoding: 'binary', // Ritorna un Buffer, non salva su file
    });

    return image as Buffer;
  }
}
