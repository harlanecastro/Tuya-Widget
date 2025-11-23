# Tuya Widget Desktop

**Versão traduzida para português**
Baseado no projeto original criado por **ilfae**.

Um widget completo para controlar lâmpadas inteligentes Tuya diretamente na área de trabalho do Windows, criado originalmente pelo desenvolvedor **ilfae**, utilizando Electron.

## Recursos

* 🏠 **Widget para área de trabalho** – funciona como um widget real no Windows
* 💡 **Controle de lâmpadas Tuya** – ligar/desligar, ajuste de brilho e cores
* 🔐 **Autenticação segura** – suporte a contas Smart Life e Tuya
* 🎨 **Interface moderna** – design bonito com tema escuro
* ⌨️ **Atalho de teclado** – Alt+T para mostrar/ocultar o widget
* 💾 **Salvamento automático** – guarda credenciais e configurações
* 🔄 **Atualização automática** – renova tokens de acesso automaticamente

---

## Instalação

### Requisitos

* Node.js 16+
* npm ou yarn
* Windows 10/11

### Passos de instalação

1. **Clone o repositório:**

   ```
   git clone https://github.com/ilfae/Tuya-Widget
   cd tuya-widget
   ```

2. **Instale as dependências:**

   ```
   npm install
   ```

3. **Execute em modo de desenvolvimento:**

   ```
   npm run dev
   ```

4. **Gere a build:**

   ```
   npm run build
   ```

---

## Uso

### Primeira execução

1. Abra o aplicativo
2. Clique em **"Autorização" (🔑)**
3. Insira suas credenciais Tuya/Smart Life:

   * **Login** – e-mail ou telefone
   * **Senha**
   * **Região** – EU/US/CN
   * **Plataforma** – Tuya ou Smart Life
4. Clique em **Entrar**
5. Selecione o dispositivo desejado na lista

### Controles das lâmpadas

* **Ligar/Desligar** – botão com ícone de energia
* **Brilho** – controle deslizante
* **Cor** – seletor de cor para lâmpadas RGB
* **Ações rápidas** – botões de atalho

### Controle da janela

* **Movimentação** – arraste o cabeçalho
* **Minimizar** – ícone de “–”
* **Modo de janela** – alternar entre widget/normal
* **Fechar** – ícone “X” (minimiza o widget)
* **Atalho** – Alt+T

---

## Estrutura do projeto

```
tuya-widget/
├── main.js              # Processo principal do Electron
├── preload.js           # Script preload para segurança
├── package.json         # Configurações do projeto
├── renderer/            # Interface
│   ├── index.html
│   ├── styles.css
│   └── widget.js
├── icons/               # Ícones do aplicativo
└── dist/                # Build final
```

---

## Configurações

### Modos de janela

* **Modo widget** (padrão):

  * 320x480
  * Sempre no topo
  * Oculto da barra de tarefas
  * Arrastável

* **Modo janela normal**:

  * 400x600
  * Comportamento padrão de janela
  * Visível na barra de tarefas

### Armazenamento de dados

O app salva automaticamente:

* Credenciais
* Lista de dispositivos
* Posição da janela
* Configurações do usuário

---

## Desenvolvimento

### Comandos

```
npm start          # Executar o app
npm run dev        # Modo desenvolvimento
npm run build      # Gerar build
npm run dist       # Criar instalador
```

### Depuração

* **F12** – abrir DevTools
* **Ctrl+Shift+I** – DevTools
* **Ctrl+R** – recarregar

---

## Segurança

* `contextIsolation` ativado
* APIs expostas apenas via preload
* Dados em armazenamento protegido
* Nenhum acesso direto ao Node.js pela interface

---

## Dispositivos suportados

* Lâmpadas RGB Tuya/Smart Life
* Lâmpadas brancas com ajuste de brilho
* Tomadas inteligentes (funções básicas)

---

## Solução de problemas

### Falha na autenticação

1. Verifique login e senha
2. Confirme a região
3. Tente usar VPN

### Falha de conexão

1. Verifique sua internet
2. Certifique-se de que o dispositivo está online
3. Atualize a lista de dispositivos

### Problemas gerais

1. Reinicie o aplicativo
2. Limpe os dados salvos
3. Reinstale

---

## Licença

MIT License

---

## Suporte

Em caso de problemas ou sugestões, abra uma *issue* no repositório original.

---


