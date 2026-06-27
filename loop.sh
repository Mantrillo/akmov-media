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

# Crear la carpeta de videos si no existe
mkdir -p "$VIDEO_DIR"

echo "=== Iniciando automatización 24/7 ==="
echo "Buscando videos en: $VIDEO_DIR"

while true; do
    # Buscar todos los archivos .mp4 en la carpeta y ordenarlos alfabéticamente
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
    for file in "${files[@]}"; do
        # Escapar comillas simples para FFmpeg
        escaped_file=$(echo "$file" | sed "s/'/'\\\\''/g")
        echo "file '$escaped_file'" >> "$PLAYLIST_FILE"
    done

    echo "Lista de reproducción creada con $(cat "$PLAYLIST_FILE" | grep -c "^file ") videos."
    echo "Transmitiendo a Owncast..."

    # Ejecutar FFmpeg para transmitir la lista completa en tiempo real
    # -re: Lee el archivo a velocidad de reproducción nativa (tiempo real)
    # -f concat: Junta los videos uno tras otro de forma fluida
    # -safe 0: Permite rutas de archivos absolutas
    # -c:v libx264: Codifica en H.264 (alta compatibilidad)
    # -preset veryfast -maxrate 2500k -bufsize 5000k: Configuración de bitrate optimizada para streaming
    # -pix_fmt yuv420p: Requerido por la mayoría de reproductores
    # -c:a aac -b:a 128k: Codificación de audio limpia
    ffmpeg -re -f concat -safe 0 -i "$PLAYLIST_FILE" \
        -c:v libx264 -preset veryfast -tune zerolatency \
        -maxrate 2500k -bufsize 5000k -pix_fmt yuv420p -g 60 \
        -c:a aac -b:a 128k -ar 44100 \
        -f flv "$OWNCAST_RTMP_URL/$STREAM_KEY"

    echo "FFmpeg terminó la lista de reproducción. Reiniciando bucle en 5 segundos..."
    sleep 5
done
