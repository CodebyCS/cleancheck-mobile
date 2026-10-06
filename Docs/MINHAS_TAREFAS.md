# Minhas Tarefas — fluxo provisório

O fluxo mobile de **Minhas Tarefas** está disponível com dados mock para validar a interface e a navegação antes da integração com a API.

- A lista separa as tarefas entre **Hoje** e **Próximas** e apresenta quatro exemplos fictícios.
- O selo **Modo de Teste** identifica que os dados apresentados não são reais.
- O progresso começa em `0/2` e é atualizado apenas em memória durante a utilização da aplicação.
- Ao selecionar uma tarefa, é aberto o respetivo detalhe com as etapas **Início**, **Final** e **Pronto**.
- As ações de gravar e enviar são simulações; não utilizam a câmara nem enviam ficheiros.
- A simulação do vídeo final permanece bloqueada até a simulação do vídeo inicial estar concluída.
- Ao concluir o fluxo, o estado e o progresso da tarefa são atualizados provisoriamente em memória.

Esta implementação ainda não consulta nem altera tarefas na API, não grava vídeos reais e não mantém o progresso após reiniciar a aplicação. A integração com dados reais, câmara e envio de ficheiros permanece pendente.