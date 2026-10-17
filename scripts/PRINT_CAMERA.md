# Câmera da fila 3D

O PC lê o vídeo RTSPS da P2S e envia um JPEG de até 640 × 360 a cada 5 segundos. A página consulta somente a última imagem, que expira após 60 segundos sem atualização. Não há gravação de vídeo nem controle da impressora.

- Bibliotecas locais: `.camera-runtime/` (PyAV 19.0.1 e Pillow 13.0.0).
- Configuração local: `.camera-local/config.json`, com IP e endpoint de upload.
- Chave de upload: `.camera-local/upload-token.xml`, protegida por Windows DPAPI para o usuário atual. A mesma chave fica no secret `PRINT_CAMERA_TOKEN` do Worker.
- O código da P2S é lido da configuração existente do Bambu Studio; não é copiado para o site nem para o Git.
- Logs rotativos sem credenciais: `.camera-local/bridge.log`.
- Inicialização: tarefa Windows `Mottameister Print Camera`, ao entrar neste usuário.
- Parar: `Stop-ScheduledTask -TaskName 'Mottameister Print Camera'`.
- Desativar início automático: `Disable-ScheduledTask -TaskName 'Mottameister Print Camera'`.
- Reiniciar: `Start-ScheduledTask -TaskName 'Mottameister Print Camera'`.

A imagem fica acessível a quem tiver o link da página, assim como a fila. Este PC precisa estar ligado, conectado à rede da impressora e com este usuário conectado. Se o IP mudar, atualize apenas o arquivo de configuração local. Se houver mais de uma impressora salva no Bambu Studio, selecione explicitamente a entrada da P2S no inicializador antes de usar.
