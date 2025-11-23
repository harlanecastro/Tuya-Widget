# Widget Tuya Desktop

Widget completo para controlar lâmpadas inteligentes Tuya na área de trabalho do Windows, criado usando Electron.

![Image](image1.png)

## Recursos

- 🏠 **Widget para área de trabalho** - funciona como um widget completo do Windows
- 💡 **Controle de lâmpadas Tuya** - ligar/desligar, ajustar brilho e cor
- 🔐 **Autenticação segura** - suporte para contas Smart Life e Tuya
- 🎨 **Interface moderna** - design bonito com tema escuro
- ⌨️ **Atalhos de teclado** - Alt+W para mostrar/ocultar o widget
- 💾 **Salvamento de configurações** - salvamento automático de dados de autenticação
- 🔄 **Atualização automática** - atualização automática de tokens de acesso

## Instalação

### Requisitos

- Node.js 16+
- npm ou yarn
- Windows 10/11

### Passos de instalação

1. **Clone o repositório:**

   ```bash
   git clone https://github.com/ilfae/Tuya-Widget
   cd tuya-widget
   ```

2. **Instale as dependências:**

   ```bash
   npm install
   ```

3. **Execute em modo de desenvolvimento:**

   ```bash
   npm run dev
   ```

4. **Compile o aplicativo:**
   ```bash
   npm run build
   ```

## Uso

### Primeiro uso

1. Inicie o aplicativo
2. Clique no botão "Autenticação" (🔑)
3. Digite os dados da sua conta Tuya/Smart Life:
   - **Login** - email ou número de telefone
   - **Senha** - senha da conta
   - **Região** - selecione sua região (EU/US/CN)
   - **Plataforma** - selecione Tuya ou Smart Life
4. Clique em "Entrar"
5. Selecione um dispositivo da lista

### Controle de lâmpadas

- **Ligar/Desligar** - botões com ícone de energia
- **Brilho** - controle deslizante com ícone de sol
- **Cor** - controle deslizante de cor para lâmpadas RGB
- **Ações rápidas** - botões para controle rápido

### Controle de janela

- **Arrastar** - arraste o cabeçalho para mover
- **Minimizar** - botão com ícone de menos
- **Alternar modo** - botão com ícone de expandir/minimizar
- **Fechar** - botão com ícone X (oculta o widget)
- **Atalhos de teclado** - Alt+W para mostrar/ocultar

## Estrutura do projeto

```
tuya-widget/
├── main.js              # Processo principal do Electron
├── preload.js           # Script preload para segurança
├── package.json         # Configuração do projeto
├── renderer/            # Arquivos de interface
│   ├── index.html       # Marcação HTML
│   ├── styles.css       # Estilos
│   └── widget.js        # Lógica do widget
├── icons/               # Ícones do aplicativo
└── dist/                # Aplicativo compilado
```

## Configuração

### Modos de janela

- **Modo widget** (padrão):

  - Tamanho: 320x480
  - Sempre no topo
  - Oculto da barra de tarefas
  - Arrastável

- **Modo normal**:
  - Tamanho: 400x600
  - Janela normal
  - Visível na barra de tarefas

### Salvamento de dados

O aplicativo salva automaticamente:

- Dados de autenticação
- Lista de dispositivos
- Posição da janela
- Configurações do usuário

## Desenvolvimento

### Comandos

```bash
npm start          # Iniciar aplicativo
npm run dev        # Executar em modo de desenvolvimento
npm run build      # Compilar aplicativo
npm run dist       # Criar instalador
```

### Depuração

Para depurar, use:

- F12 - abrir DevTools
- Ctrl+Shift+I - abrir DevTools
- Ctrl+R - recarregar aplicativo

## Segurança

- Usa `contextIsolation` para segurança
- Todas as chamadas de API passam pelo script preload
- Dados são salvos no armazenamento protegido do Electron
- Não há acesso direto à API do Node.js a partir do processo renderer

## Dispositivos suportados

- Lâmpadas RGB Tuya/Smart Life
- Lâmpadas brancas com ajuste de brilho
- Tomadas inteligentes (controle básico)

## Solução de problemas

### Problemas com autenticação

1. Verifique se o login e a senha estão corretos
2. Certifique-se de que a região correta está selecionada
3. Tente usar VPN se houver problemas de acesso

### Problemas de conexão

1. Verifique a conexão com a internet
2. Certifique-se de que os dispositivos estão conectados à rede
3. Tente atualizar a lista de dispositivos

### Problemas com o aplicativo

1. Reinicie o aplicativo
2. Limpe os dados salvos
3. Reinstale o aplicativo

## Licença

MIT License

## Suporte

Se você tiver problemas ou sugestões de melhoria, crie uma issue no repositório do projeto.
