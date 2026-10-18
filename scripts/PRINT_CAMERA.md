# Câmera da fila 3D

O PC repassa o vídeo H.264 da P2S como HLS, sem recodificar: imagem contínua em 1080p/30 fps, com alguns segundos de atraso. O player usa HLS nativo no Safari e HLS.js nos navegadores compatíveis com MediaSource. A página pausa a transmissão quando fica em segundo plano e tenta reconectar se o vídeo parar.

- Bibliotecas locais: `.camera-runtime/` (PyAV 19.0.1; Pillow 13.0.0 para o modo antigo por fotos).
- Configuração local: `.camera-local/config.json`, com `ip`, `endpoint` e `mode: "live"`.
- Chave de upload: `.camera-local/upload-token.xml`, protegida pelo Windows DPAPI para o usuário atual. A mesma chave fica no secret `PRINT_CAMERA_TOKEN` do Worker.
- O código da P2S é lido da configuração existente do Bambu Studio; não é copiado para o site nem para o Git.
- Logs rotativos sem credenciais: `.camera-local/live.log`.
- Inicialização: tarefa Windows `Mottameister Print Camera`, ao entrar neste usuário.
- Parar: `Stop-ScheduledTask -TaskName 'Mottameister Print Camera'`.
- Desativar início automático: `Disable-ScheduledTask -TaskName 'Mottameister Print Camera'`.
- Reiniciar: `Start-ScheduledTask -TaskName 'Mottameister Print Camera'`.

A API mantém uma janela móvel de até 18 segmentos de vídeo e a playlist atual; não é um arquivo de gravações. A playlist expira após 20 segundos sem upload e os segmentos antigos deixam de ser servidos após 2 minutos. Somente a ponte com a chave pode enviar vídeo.

A imagem fica acessível a quem tiver o link da página, assim como a fila. Este PC precisa estar ligado, conectado à rede da impressora e com este usuário conectado. Se o IP mudar, atualize apenas o arquivo de configuração local. Se houver mais de uma impressora salva no Bambu Studio, selecione explicitamente a entrada da P2S no inicializador antes de usar.

O inicializador ainda suporta `mode: "snapshot"` para o script antigo de fotos, mas esse modo exige restaurar o player anterior da página para funcionar como rollback completo.
