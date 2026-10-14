# Clima Pixel

**Atividade prática • UC5- Front-end de Projetos Web • Programa Jovem Programador**

Aplicação de previsão do tempo desenvolvida para a atividade prática com a API Open-Meteo. A pessoa usuária pesquisa uma cidade e acompanha as condições atuais e a previsão dos próximos cinco dias em uma interface responsiva, ilustrada em pixel art.

## Funcionalidades

- Busca de cidades com sugestões de locais, regiões e países disponíveis.
- Consulta de temperatura, umidade, sensação térmica, vento e condição atual.
- Previsão para cinco dias, com temperaturas mínima e máxima e probabilidade de chuva.
- Ícones pixel art para as condições meteorológicas, com animações interativas.
- Cena de cidade em pixel art que acompanha o clima, com efeitos e elementos animados.
- Estados de carregamento, mensagens de erro e opção para tentar a consulta novamente.
- Interface adaptada para computadores e celulares.

## Tecnologias

- **HTML5** para a estrutura e os elementos acessíveis.
- **CSS3** para a identidade visual, responsividade e animações.
- **JavaScript** para as consultas HTTP, leitura do JSON e atualização da interface.
- **Open-Meteo** para geocodificação e dados meteorológicos. A aplicação não precisa de chave de API.

## Como executar

Abra a pasta `clima-app` no Visual Studio Code e inicie um servidor HTTP local, como a extensão Live Server. Também é possível iniciar um servidor com Python a partir da pasta raiz do repositório:

```powershell
python -m http.server 8000 --directory clima-app
```

Depois, abra `http://localhost:8000` no navegador. A conexão com a internet é necessária para consultar os serviços da Open-Meteo.

## Estrutura

```text
.
├── clima-app/
│   ├── assets/
│   │   └── pixel-city.png
│   ├── index.html
│   ├── script.js
│   └── style.css
├── social-media/
│   ├── clima-pixel-bastidores.png
│   ├── clima-pixel-capa.png
│   ├── clima-pixel-climas.png
│   ├── clima-pixel-uc5-jovem-programador.png
│   ├── clima-pixel-linkedin.png
│   ├── clima-pixel-linkedin-apresentacao.png
│   ├── clima-pixel-linkedin-pagina.png
│   └── clima-pixel-linkedin-vscode.png
├── clima-app.zip
└── README.md
```

O arquivo `clima-app.zip` é a versão compactada para entrega da atividade. Os arquivos-fonte também estão disponíveis na pasta `clima-app`.

## Materiais para redes sociais

Quatro artes verticais em proporção 4:5 para redes sociais. Para o LinkedIn, preparei uma composição com capturas reais e três imagens individuais para montar uma sequência: apresentação da disciplina, página em execução e print do VS Code. O código mostrado é uma captura do editor, sem recriação dos trechos.

- [Capa do Clima Pixel](social-media/clima-pixel-capa.png)
- [A cidade muda com o clima](social-media/clima-pixel-climas.png)
- [Bastidores do código](social-media/clima-pixel-bastidores.png)
- [Ilustração da UC5 e do Jovem Programador](social-media/clima-pixel-uc5-jovem-programador.png)
- [Composição para LinkedIn — aplicação e print do VS Code](social-media/clima-pixel-linkedin.png)
- [Apresentação da UC5 e do Jovem Programador](social-media/clima-pixel-linkedin-apresentacao.png)
- [Página em execução](social-media/clima-pixel-linkedin-pagina.png)
- [Print real do VS Code](social-media/clima-pixel-linkedin-vscode.png)

## Serviços consultados

- Geocodificação de cidades: `https://geocoding-api.open-meteo.com/v1/search`
- Previsão do tempo: `https://api.open-meteo.com/v1/forecast`
- Site da Open-Meteo: [open-meteo.com](https://open-meteo.com/)

Projeto acadêmico. Os dados meteorológicos são fornecidos pela Open-Meteo.
