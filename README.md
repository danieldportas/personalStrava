# PersonalStrava

App movil (Expo / React Native) que genera una planificacion deportiva semanal
detallada -running y gimnasio- a partir de tus datos reales de Strava.

## Como funciona

- **`backend/`**: API en Node/Express. Gestiona el login OAuth con Strava (es
  el unico sitio que conoce tu `client_secret`), sincroniza tus actividades y
  ejecuta el motor de planificacion. Guarda los datos en un fichero JSON local
  (`backend/data/db.json`), sin necesidad de instalar ni desplegar una base de
  datos.
- **`mobile/`**: app Expo/React Native (TypeScript) que consume esa API:
  pantalla de conexion con Strava, configuracion de objetivo/disponibilidad,
  dashboard con tu carga de entrenamiento, plan semanal dia a dia y detalle de
  cada sesion.

### El motor de planificacion (`backend/src/services/`)

- `metrics.ts`: calcula tu volumen semanal de las ultimas 8 semanas, tu ratio
  de carga aguda:cronica (ACWR, indicador de riesgo de lesion), tu ritmo
  umbral estimado a partir de tus mejores esfuerzos recientes y tu tirada
  larga mas reciente.
- `planner.ts`: genera el plan de la semana en curso siguiendo un mesociclo de
  4 semanas (progresion, progresion, pico, descarga), recorta la progresion si
  tu ACWR indica riesgo, reparte sesiones de calidad (tempo/series), tirada
  larga y rodajes suaves evitando poner fuerza pesada de piernas justo antes
  de una sesion exigente, y aplica una fase de puesta a punto (taper)
  automatica si configuras una fecha de carrera.
- `exercises.ts`: libreria de fuerza especifica para corredores (potencia,
  estabilidad unilateral/prevencion de lesiones, tren superior/core,
  movilidad), con variantes de gimnasio y de peso corporal.

## Requisitos previos

- Node.js 18+
- La app [Expo Go](https://expo.dev/go) instalada en tu movil (o un
  emulador/simulador).
- Una aplicacion creada en <https://www.strava.com/settings/api> (gratis) para
  obtener tu `Client ID` y `Client Secret`.

## 1. Configura tu app de Strava

En <https://www.strava.com/settings/api>, crea una aplicacion. Anota el
**Client ID** y el **Client Secret**. El campo **"Authorization Callback
Domain"** debe coincidir exactamente con el dominio (sin `https://` ni ruta)
que uses como `STRAVA_REDIRECT_URI` en el paso siguiente.

Para desarrollo, la forma mas sencilla de que tu movil pueda completar el
login y llegar a tu backend es exponer el backend con un tunel (por ejemplo
[ngrok](https://ngrok.com) o `cloudflared`):

```bash
ngrok http 4000
# copia la URL https que te da, p.ej. https://abcd1234.ngrok-free.app
```

Usa ese dominio (`abcd1234.ngrok-free.app`) como "Authorization Callback
Domain" en Strava.

## 2. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edita `backend/.env`:

```
STRAVA_CLIENT_ID=tu_client_id
STRAVA_CLIENT_SECRET=tu_client_secret
STRAVA_REDIRECT_URI=https://abcd1234.ngrok-free.app/api/auth/strava/callback
MOBILE_APP_SCHEME=personalstrava
PORT=4000
```

Arranca el servidor:

```bash
npm run dev
```

Deberias ver `personalStrava backend escuchando en http://localhost:4000`. Si
usas un tunel, apuntalo hacia el puerto 4000 (`ngrok http 4000`).

## 3. App movil

```bash
cd mobile
npm install
```

La app necesita saber donde esta tu backend. Por defecto usa
`http://localhost:4000` (sirve si pruebas en el simulador de iOS o en el
navegador). Para probar en un movil fisico con Expo Go, crea
`mobile/.env` apuntando al mismo tunel que configuraste en Strava:

```
EXPO_PUBLIC_API_URL=https://abcd1234.ngrok-free.app
```

Arranca Expo:

```bash
npx expo start
```

Escanea el QR con la app Expo Go (Android) o la camara (iOS). La primera
pantalla te dejara conectar con Strava; tras autorizar, configuras tu
objetivo (5K/10K/media/maraton/forma fisica general), dias disponibles de
carrera y de gimnasio, y accedes al dashboard con tu plan de la semana.

## Notas

- Esta app esta pensada para un unico usuario (tu). El backend no tiene
  gestion multiusuario mas alla de lo necesario para guardar tu token de
  Strava de forma segura.
- Los ritmos y zonas de FC del plan se recalculan cada vez que sincronizas
  actividades: cuantas mas carreras tengas en Strava, mas preciso sera tu
  ritmo umbral estimado.
- `backend/data/db.json` contiene tus tokens de Strava y actividades
  sincronizadas; no lo subas a ningun repositorio publico (ya esta en
  `.gitignore`).
