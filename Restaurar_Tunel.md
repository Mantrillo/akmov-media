# Guía de Restauración del Túnel de Cloudflare en Ubuntu

Si eliminaste accidentalmente el túnel (`cloudflared`) en tu servidor Ubuntu, aquí tienes las instrucciones paso a paso para restaurarlo y hacer que `stream.akmovmedia.com` y `api.akmovmedia.com` vuelvan a funcionar.

---

## Pre-requisitos: Verificar que los servicios locales están corriendo

Antes de configurar el túnel, asegúrate de que tus aplicaciones internas estén funcionando en el servidor Ubuntu:

1. **Owncast (Puerto 8080)**:
   ```bash
   sudo systemctl status owncast
   # o verifica si está escuchando:
   curl -I http://localhost:8080
   ```
2. **Admin API (Puerto 3001)**:
   ```bash
   # Comprobar si el servicio Node está corriendo
   curl -I http://localhost:3001/
   ```

---

## Método 1: Usando Cloudflare Zero Trust Dashboard (Recomendado y más fácil)

Si manejas el túnel desde la interfaz web de Cloudflare, no necesitas configurar archivos locales `.yml`.

### Paso 1: Crear el Túnel en la Web de Cloudflare
1. Inicia sesión en [Cloudflare Zero Trust](https://one.dash.cloudflare.com/).
2. Ve a **Networks** > **Tunnels**.
3. Haz clic en **Add a tunnel**.
4. Selecciona **Cloudflared** y presiona *Next*.
5. Nombra el túnel (por ejemplo, `akmov-server`) y presiona *Save tunnel*.

### Paso 2: Instalar y Correr el Túnel en Ubuntu
El Dashboard te dará un comando de instalación para **Debian / Ubuntu (64-bit)**. Será similar a este:
```bash
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb && \
sudo dpkg -i cloudflared.deb && \
sudo cloudflared service install <TU_TOKEN_AQUÍ>
```
*Copia el comando exacto con tu token desde el panel de Cloudflare y ejecútalo en la terminal de tu servidor Ubuntu.*

### Paso 3: Configurar las Rutas (Public Hostnames)
En la misma página del túnel en Cloudflare, ve a la pestaña **Public Hostname** y añade las siguientes dos reglas:

1. **Para el Stream y Chat (stream.akmovmedia.com)**:
   * **Subdomain**: `stream`
   * **Domain**: `akmovmedia.com`
   * **Type**: `HTTP`
   * **URL**: `localhost:8080`

2. **Para la API (api.akmovmedia.com)**:
   * **Subdomain**: `api`
   * **Domain**: `akmovmedia.com`
   * **Type**: `HTTP`
   * **URL**: `localhost:3001`

¡Listo! Con esto, el túnel se levantará automáticamente y Cloudflare creará los registros DNS correspondientes.

---

## Método 2: Configuración Local vía Archivo de Configuración (CLI)

Si prefieres configurar el túnel directamente desde la terminal del servidor Ubuntu usando archivos `.yml`, sigue estos pasos:

### Paso 1: Instalar cloudflared
Si no está instalado, descárgalo e instálalo:
```bash
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
```

### Paso 2: Autenticar en Cloudflare
Ejecuta el siguiente comando para vincular tu servidor con tu cuenta:
```bash
cloudflared tunnel login
```
*Te dará un enlace. Ábrelo en tu navegador, inicia sesión en Cloudflare y selecciona el dominio `akmovmedia.com` para autorizarlo.*

### Paso 3: Crear el Túnel
Crea un nuevo túnel llamado `akmov-tunnel`:
```bash
cloudflared tunnel create akmov-tunnel
```
*Este comando imprimirá un **UUID** del túnel y creará un archivo de credenciales en `/home/mantrillo/.cloudflared/<UUID>.json` (o similar).*

### Paso 4: Crear el Archivo de Configuración
Crea el directorio de configuración si no existe:
```bash
mkdir -p ~/.cloudflared
```
Crea y edita el archivo `config.yml`:
```bash
nano ~/.cloudflared/config.yml
```
Pega el siguiente contenido (reemplazando `<TU_TUNNEL_UUID>` por el UUID obtenido en el Paso 3, y asegurándote de usar la ruta correcta al archivo `.json` de credenciales):
```yaml
tunnel: <TU_TUNNEL_UUID>
credentials-file: /home/mantrillo/.cloudflared/<TU_TUNNEL_UUID>.json

ingress:
  - hostname: stream.akmovmedia.com
    service: http://localhost:8080
  - hostname: api.akmovmedia.com
    service: http://localhost:3001
  - service: http_status:404
```
Guarda el archivo (`Ctrl+O`, `Enter`, `Ctrl+X`).

### Paso 5: Asociar los Nombres de Dominio en DNS
Asocia tus subdominios al túnel:
```bash
cloudflared tunnel route dns akmov-tunnel stream.akmovmedia.com
cloudflared tunnel route dns akmov-tunnel api.akmovmedia.com
```

### Paso 6: Ejecutar y Configurar como Servicio
Prueba que el túnel funcione correctamente:
```bash
cloudflared tunnel run akmov-tunnel
```
Si todo funciona bien y puedes ver el stream, instálalo como servicio del sistema para que inicie automáticamente cuando se encienda el servidor:
```bash
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

---

## Comandos Útiles de Diagnóstico en Ubuntu

* **Ver el estado del servicio del túnel**:
  ```bash
  sudo systemctl status cloudflared
  ```
* **Ver los logs en tiempo real para buscar errores**:
  ```bash
  sudo journalctl -u cloudflared -f
  ```
* **Ver la lista de túneles locales activos**:
  ```bash
  cloudflared tunnel list
  ```
