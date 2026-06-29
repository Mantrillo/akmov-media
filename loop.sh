#!/bin/bash

# ==============================================================================
# SCRIPT DE TRANSMISIÓN 24/7 PARA OWNCAST (AKMOV MEDIA)
# ==============================================================================
# Este script toma todos los videos en la carpeta especificada, genera una lista,
# y los transmite continuamente en bucle infinito hacia tu servidor de Owncast.
# ==============================================================================

# CONFIGURACIÓN
VIDEO_DIR="/mnt/videos"                    # Carpeta donde subirás tus videos (.mp4)
PLAYLIST_FILE="/tmp/owncast_playlist.txt"   # Archivo temporal de lista de reproducción
OWNCAST_RTMP_URL="rtmp://localhost:1935/live"   # Dirección RTMP de tu Owncast
STREAM_KEY="abc123"                         # Reemplaza por tu Stream Key de Owncast
RANDOM_PLAY=true                            # ¿Reproducir en orden aleatorio? (true/false)

# Crear la carpeta de videos si no existe
mkdir -p "$VIDEO_DIR"

echo "=== Iniciando automatización 24/7 ==="
echo "Buscando videos en: $VIDEO_DIR"

while true; do
    # Buscar todos los archivos .mp4 en la carpeta
    files=("$VIDEO_DIR"/*.mp4)
    
    # Validar que existan videos
    if [ ! -e "${files[0]}" ]; then
        echo "ERROR: No hay archivos .mp4 en $VIDEO_DIR"
        echo "Sube videos a esa carpeta y el script los detectará en 10 segundos..."
        sleep 10
        continue
    fi

    # Generar el archivo de lista de reproducción en el formato de FFmpeg
    echo "# Lista de videos generada el $(date)" > "$PLAYLIST_FILE"
    
    if [ "$RANDOM_PLAY" = true ]; then
        echo "Modo aleatorio activado. Mezclando videos..."
        # Mezclar la lista de archivos usando null-delimiters para manejar espacios de forma segura
        printf '%s\0' "${files[@]}" | shuf -z | while IFS= read -r -d '' file; do
            escaped_file=$(echo "$file" | sed "s/'/'\\\\''/g")
            echo "file '$escaped_file'" >> "$PLAYLIST_FILE"
        done
    else
        echo "Modo ordenado activado. Procesando videos alfabéticamente..."
        for file in "${files[@]}"; do
            escaped_file=$(echo "$file" | sed "s/'/'\\\\''/g")
            echo "file '$escaped_file'" >> "$PLAYLIST_FILE"
        done
    fi

    echo "Lista de reproducción creada con $(cat "$PLAYLIST_FILE" | grep -c "^file ") videos."
    echo "Transmitiendo a Owncast..."

    # Ejecutar FFmpeg para transmitir la lista completa en tiempo real
    # -re: Lee el archivo a velocidad de reproducción nativa (tiempo real)
    # -fflags +genpts+discardcorrupt: Ignora paquetes corruptos y regenera timestamps
    # -f concat: Junta los videos uno tras otro
    # -safe 0: Permite rutas absolutas
    # -vf scale=1280:720: Reduce la resolución a 720p para aliviar la carga de CPU
    # -max_interleave_delta 0: Evita que FFmpeg se quede esperando indefinidamente si el audio y video se desfasan
    ffmpeg -re -fflags +genpts+discardcorrupt -f concat -safe 0 -i "$PLAYLIST_FILE" \
        -vf "scale=1280:720" -c:v libx264 -preset ultrafast -tune zerolatency \
        -maxrate 2000k -bufsize 4000k -pix_fmt yuv420p -g 60 -fps_mode cfr \
        -c:a aac -b:a 128k -ar 44100 -max_interleave_delta 0 \
        -f flv "$OWNCAST_RTMP_URL/$STREAM_KEY"

    echo "FFmpeg terminó la lista de reproducción. Reiniciando bucle en 5 segundos..."
    sleep 5
done
