# Manual do Módulo de Custódia de Certificados A1

Este módulo permite gerenciar Certificados Digitais A1 (`.pfx`) de forma segura e eficiente (Zero-Knowledge). A extração dos dados e a validação da senha ocorrem localmente no seu navegador.

## Como utilizar

1. **Acesse o Módulo**: No menu lateral esquerdo (Side Navigation), clique na opção **Certificados A1**.
2. **Adicionar Certificado**: Clique no botão azul **Adicionar Certificado A1**. Um modal de upload será exibido.
3. **Upload do Arquivo**: Arraste e solte o seu arquivo `.pfx` (tamanho máximo de 50KB) ou clique na área tracejada para selecioná-lo no seu computador.
4. **Validar Senha**: Insira a senha do certificado e clique em **Validar e Salvar**.
   - O sistema fará a leitura e descriptografia temporária na memória do seu navegador. O arquivo original ou a senha não são enviados em texto plano para os servidores.
5. **Pré-visualização**: Se a senha estiver correta, um card verde de sucesso exibirá os dados extraídos automaticamente: Razão Social, CNPJ e a Data de Vencimento.
6. **Salvar**: Clique em **Salvar Certificado**.
   - O certificado agora está guardado no seu cofre como um item seguro. O CNPJ é salvo no campo "Nome de Usuário" e a data de vencimento num Campo Personalizado, para fácil preenchimento futuro através das extensões de navegador nos sites como e-CAC e Emissor Nacional da NFS-e.

## Limitações de Segurança

* **Tamanho Máximo:** Por questões de performance, a leitura local bloqueia arquivos com mais de 50KB. Isso engloba 99% dos certificados e-CNPJ e e-CPF do Brasil.
* **Privacidade:** A biblioteca criptográfica opera apenas em Client-Side, mantendo o modelo *Zero-Knowledge* padrão do Bitwarden.
