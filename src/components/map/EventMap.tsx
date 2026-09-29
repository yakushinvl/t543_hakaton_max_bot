import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Map as MLMap, NavigationControl, Marker, type GeoJSONSource } from 'maplibre-gl';
import Supercluster from 'supercluster';
import type { FeatureCollection } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { EventItem } from '../../types/event';
import { CITIES, DEFAULT_CITY, type City, getDistanceKm, getCityRadiusKm, getCityZoomThreshold } from '../../data/cities';
import { EVENT_CATEGORIES_CONFIG, getEventCategoryColor, getEventCategoryEmoji } from '../../config/categories.config';
import { getEmojiImage } from '../icons/emojiIcons';

// Заранее подгружаем SVG-иконки категорий, чтобы метки без фото рисовались сразу с ними
EVENT_CATEGORIES_CONFIG.forEach((cat) => getEmojiImage(cat.emoji));
getEmojiImage('✨');
import { triggerHaptic } from '../../lib/maxBridge';
import { detectUserLocation, getCachedLocation, type UserLocationResult } from '../../lib/geolocation';
import { Calendar, X, ChevronRight, Crosshair, MapPin } from 'lucide-react';
import './EventMap.css';

// 100% бесплатный векторный стиль OpenFreeMap
const PRIMARY_STYLE = 'https://tiles.openfreemap.org/styles/positron';

const SOURCE_ID = 'events';
const USER_SOURCE_ID = 'user-location';
const CLUSTER_MAX_ZOOM = 15;
const ICON_SIZE = 120; // px (увеличено на 25%, 60px CSS при pixelRatio: 2)

// Кэш подготовленных ImageData для одиночных меток
const markerCache = new Map<string, ImageData>();

/**
 * Выборка топ-5 цветов по частоте среди мероприятий кластера
 */
function getTopCategoryColors(colors: string[], maxColors = 5): string[] {
  const counts = new Map<string, number>();
  colors.forEach((col) => {
    if (!col) return;
    counts.set(col, (counts.get(col) || 0) + 1);
  });

  // Сортируем цвета по убыванию количества мероприятий
  const sorted = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([color]) => color);

  return sorted.slice(0, maxColors);
}

/**
 * Построение CSS кругового (конического) градиента в цвета мероприятий кластера
 * Если цветов больше 5 — отображаются топ-5 цветов по количеству
 */
function buildConicGradientStyle(colors: string[]): string {
  const topColors = getTopCategoryColors(colors, 5);
  if (topColors.length === 0) return '#6c5ce7';
  if (topColors.length === 1) return topColors[0];
  // Замыкаем круговой градиент на начальный цвет для плавного бесшовного перехода
  return `conic-gradient(from 0deg, ${topColors.join(', ')}, ${topColors[0]})`;
}

/**
 * Проверка: относятся ли два мероприятия к одному месту (одному адресу/площадке)
 */
export function areEventsAtSameVenue(
  e1: { lat: number; lon: number; address?: string; place?: string },
  e2: { lat: number; lon: number; address?: string; place?: string }
): boolean {
  if (e1.address && e2.address && e1.address.trim().toLowerCase() === e2.address.trim().toLowerCase()) {
    return true;
  }
  if (e1.place && e2.place && e1.place.trim().toLowerCase() === e2.place.trim().toLowerCase()) {
    return true;
  }
  // Расстояние менее 45 метров считается одной площадкой
  const dist = getDistanceKm(e1.lat, e1.lon, e2.lat, e2.lon);
  return dist < 0.045;
}

/**
 * Группировка мероприятий по площадкам (адресам)
 */
export function groupEventsByVenue(items: EventItem[]): EventItem[][] {
  const groups: EventItem[][] = [];
  items.forEach((item) => {
    const matchedGroup = groups.find((g) => areEventsAtSameVenue(g[0], item));
    if (matchedGroup) {
      matchedGroup.push(item);
    } else {
      groups.push([item]);
    }
  });
  return groups;
}

/**
 * Генерация круглой метки мероприятия с фото (размер увеличен на 25%):
 * - Фотография занимает всю метку
 * - Обводка красится в цвет категории
 * - Если по этому адресу несколько мероприятий: справа снизу рисуется кружочек "+N"
 */
function createEventPhotoMarker(
  img: HTMLImageElement | null,
  categoryColor: string,
  categoryEmoji: string,
  additionalCount = 0
): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = ICON_SIZE;
  canvas.height = ICON_SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const r = ICON_SIZE / 2;

  ctx.clearRect(0, 0, ICON_SIZE, ICON_SIZE);

  // 1. Отрисовка фото на ВСЮ метку (диаметр увеличен на 25%)
  ctx.save();
  ctx.beginPath();
  ctx.arc(r, r, r - 4, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, 0, 0, ICON_SIZE, ICON_SIZE);
  } else {
    const grad = ctx.createLinearGradient(0, 0, ICON_SIZE, ICON_SIZE);
    grad.addColorStop(0, categoryColor);
    grad.addColorStop(1, '#2c1654');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, ICON_SIZE, ICON_SIZE);

    const iconImg = getEmojiImage(categoryEmoji);
    if (iconImg && iconImg.complete && iconImg.naturalWidth > 0) {
      const iconSize = ICON_SIZE * 0.5;
      ctx.drawImage(iconImg, r - iconSize / 2, r - iconSize / 2, iconSize, iconSize);
    } else {
      ctx.font = '40px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(categoryEmoji, r, r + 1);
    }
  }
  ctx.restore();

  // 2. Тонкая белая внутренняя окантовка (контрастный разделитель между фото и цветом)
  ctx.beginPath();
  ctx.arc(r, r, r - 5, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  // 3. ОБВОДКА МЕТКИ В ЦВЕТ МЕРОПРИЯТИЯ (толщина 6px, увеличено на 25%)
  ctx.beginPath();
  ctx.arc(r, r, r - 4, 0, Math.PI * 2);
  ctx.lineWidth = 6;
  ctx.strokeStyle = categoryColor;
  ctx.stroke();

  // 4. Внешний тонкий контур для объемной тени
  ctx.beginPath();
  ctx.arc(r, r, r - 0.5, 0, Math.PI * 2);
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.stroke();

  // 5. КРУЖОЧЕК СПРАВА СНИЗУ С ЦИФРОЙ "+N", если по одному адресу несколько мероприятий
  if (additionalCount > 0) {
    const badgeR = 21; // радиус бейджа увеличен на 25% (было 17)
    const badgeX = ICON_SIZE - badgeR - 3;
    const badgeY = ICON_SIZE - badgeR - 3;

    // Внешняя тень бейджа
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;

    // Круг бейджа
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
    ctx.fillStyle = '#6c5ce7'; // Фирменный фиолетовый акцент MAX
    ctx.fill();
    ctx.restore();

    // Белая окантовка бейджа
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Текст "+N"
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Inter", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`+${additionalCount}`, badgeX, badgeY + 0.5);
  }

  return ctx.getImageData(0, 0, ICON_SIZE, ICON_SIZE);
}

// Регистрация и обновление отдельной метки события (с учетом +N бейджа площадки)
function registerEventMarker(
  map: MLMap,
  id: string,
  photoUrl: string,
  category: string,
  additionalCount = 0
): void {
  const iconId = `event-icon-${id}${additionalCount > 0 ? `-plus-${additionalCount}` : ''}`;
  if (map.hasImage(iconId)) return;

  const categoryColor = getEventCategoryColor(category);
  const categoryEmoji = getEventCategoryEmoji(category);

  if (markerCache.has(iconId)) {
    try {
      if (!map.hasImage(iconId)) {
        map.addImage(iconId, markerCache.get(iconId)!, { pixelRatio: 2 });
      }
    } catch {}
    return;
  }

  // Мгновенная регистрация с обводкой в цвет мероприятия и +N бейджем
  try {
    const initialMarker = createEventPhotoMarker(null, categoryColor, categoryEmoji, additionalCount);
    markerCache.set(iconId, initialMarker);
    if (!map.hasImage(iconId)) {
      map.addImage(iconId, initialMarker, { pixelRatio: 2 });
    }
  } catch {}

  // Асинхронно скачиваем фото и обновляем метку
  if (photoUrl) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const photoMarker = createEventPhotoMarker(img, categoryColor, categoryEmoji, additionalCount);
        markerCache.set(iconId, photoMarker);
        if (map.hasImage(iconId)) {
          map.updateImage(iconId, photoMarker);
        } else {
          map.addImage(iconId, photoMarker, { pixelRatio: 2 });
        }
      } catch {
        // При ошибке CORS сохраняется начальный маркер с цветной обводкой
      }
    };
    img.src = photoUrl;
  }
}

// Преобразование групп площадок в GeoJSON (одна точка на площадку с фото и +N бейджем)
function toGeoJSON(venueGroups: EventItem[][]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: venueGroups.map((group) => {
      const item = group[0];
      const additionalCount = group.length - 1;
      const color = getEventCategoryColor(item.category);
      const iconId = `event-icon-${item.id}${additionalCount > 0 ? `-plus-${additionalCount}` : ''}`;

      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [item.lon, item.lat] },
        properties: {
          id: item.id,
          title: item.title,
          category: item.category,
          color,
          place: item.place,
          date: item.date,
          image: item.image,
          sourceName: item.sourceName || '',
          icon: iconId,
          additionalCount,
          venueEventCount: group.length,
          venueEventIds: group.map((g) => g.id).join(','),
        },
      };
    }),
  };
}

interface EventMapProps {
  events: EventItem[];
  citySlug: string;
  onSelectEvent: (event: EventItem) => void;
  onSelectCity?: (city: City) => void;
  onMapReady?: () => void;
}

export const EventMap: React.FC<EventMapProps> = ({
  events,
  citySlug,
  onSelectEvent,
  onSelectCity,
  onMapReady,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [selected, setSelected] = useState<EventItem | null>(null);
  const [selectedVenueEvents, setSelectedVenueEvents] = useState<EventItem[]>([]);

  // Группировка мероприятий по площадкам/адресам
  const venueGroups = useMemo(() => groupEventsByVenue(events), [events]);
  const venueEventsMapRef = useRef<Map<string, EventItem[]>>(new Map());

  useEffect(() => {
    const vMap = new Map<string, EventItem[]>();
    venueGroups.forEach((group) => {
      group.forEach((item) => {
        vMap.set(item.id, group);
      });
    });
    venueEventsMapRef.current = vMap;
  }, [venueGroups]);

  // Готовность карты
  const [mapLoaded, setMapLoaded] = useState(false);

  // Локация пользователя
  const [userLocation, setUserLocation] = useState<UserLocationResult | null>(() => getCachedLocation());
  const [isLocating, setIsLocating] = useState(false);

  // Ссылки на актуальные пропсы и обработчики (предотвращают лишние перерендеры карты)
  const citySlugRef = useRef(citySlug);
  citySlugRef.current = citySlug;

  const onMapReadyRef = useRef(onMapReady);
  onMapReadyRef.current = onMapReady;

  const onSelectCityRef = useRef(onSelectCity);
  onSelectCityRef.current = onSelectCity;

  // Ссылки на маркеры названий городов и флаг плавного перелёта
  const cityBadgesRef = useRef<{ city: City; marker: Marker; el: HTMLElement }[]>([]);
  const isFlyingToCityRef = useRef(false);
  const transitionIdRef = useRef(0);
  const transitionPhaseRef = useRef<'idle' | 'panning' | 'zooming'>('idle');

  // Кластеризация перекрывающихся мероприятий со счётчиками и круговыми градиентами
  const superclusterRef = useRef<Supercluster<any, any> | null>(null);
  const clusterMarkersRef = useRef<Marker[]>([]);
  const currentClusterZoomRef = useRef<number>(-1);

  // Отслеживание города, чьи мероприятия начинают прогружаться
  const [loadingCitySlug, setLoadingCitySlug] = useState<string>(citySlug);
  const loadingCitySlugRef = useRef<string>(citySlug);

  useEffect(() => {
    setLoadingCitySlug(citySlug);
    loadingCitySlugRef.current = citySlug;
  }, [citySlug]);

  const city = useMemo(() => {
    return CITIES.find((c) => c.slug === citySlug) || DEFAULT_CITY;
  }, [citySlug]);

  // Двухэтапная плавная анимация перехода к городу:
  // 1 ЭТАП: плавное движение карты от текущей позиции к координатам города
  // 2 ЭТАП: плавное приближение (zoom in) к центру города
  const transitionToCity = useCallback((targetCity: City, targetZoom = 12.5) => {
    const map = mapRef.current;
    if (!map) return;

    const currentTransId = ++transitionIdRef.current;
    isFlyingToCityRef.current = true;
    transitionPhaseRef.current = 'panning';
    setLoadingCitySlug(targetCity.slug);
    loadingCitySlugRef.current = targetCity.slug;

    // Мгновенно скрываем значок города, к которому летим, и текущего города
    cityBadgesRef.current.forEach(({ city: c, el }) => {
      if (c.slug === targetCity.slug || c.slug === citySlugRef.current) {
        el.classList.add('hidden-current-city', 'hidden-zoom');
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
      }
    });

    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();
    const distKm = getDistanceKm(currentCenter.lat, currentCenter.lng, targetCity.lat, targetCity.lon);

    // Если мы уже в этой точке и на нужном зуме
    if (distKm < 0.5 && Math.abs(currentZoom - targetZoom) < 0.3) {
      isFlyingToCityRef.current = false;
      transitionPhaseRef.current = 'idle';
      return;
    }

    // ЭТАП 1: Плавное перемещение (движение) карты к выбранному городу
    // Если текущий зум высокий (> 7.5), плавно летим на обзорном масштабе (6.5),
    // чтобы скольжение по карте между городами было наглядным и красивым
    const panZoom = currentZoom > 7.5 ? 6.5 : currentZoom;
    const panDuration = Math.min(1800, Math.max(1200, Math.round(distKm * 0.9)));

    // Запускаем плавное движение карты к координатам города
    map.easeTo({
      center: [targetCity.lon, targetCity.lat],
      zoom: panZoom,
      duration: panDuration,
      essential: true,
      easing: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    });

    const handleMoveEnd = () => {
      if (transitionIdRef.current !== currentTransId) {
        map.off('moveend', handleMoveEnd);
        return;
      }

      if (transitionPhaseRef.current === 'panning') {
        // Завершился ЭТАП 1: долетели до города, запускаем ЭТАП 2 (приближение к городу)
        transitionPhaseRef.current = 'zooming';
        map.easeTo({
          center: [targetCity.lon, targetCity.lat],
          zoom: targetZoom,
          duration: 1200,
          essential: true,
          easing: (t) => t * (2 - t),
        });
        return;
      }

      if (transitionPhaseRef.current === 'zooming') {
        // Завершился ЭТАП 2: приближение выполнено
        map.off('moveend', handleMoveEnd);
        transitionPhaseRef.current = 'idle';
        isFlyingToCityRef.current = false;
      }
    };

    map.on('moveend', handleMoveEnd);
  }, []);

  // Обработчик переключения на город
  const handleSelectCity = useCallback(
    (targetCity: City) => {
      triggerHaptic('medium');
      transitionToCity(targetCity, 12.5);
      onSelectCityRef.current?.(targetCity);
    },
    [transitionToCity]
  );

  // Автоматическое переключение на город при приближении к нему (с учетом границ города и агломерации)
  const checkAutoCitySwitch = useCallback(() => {
    const map = mapRef.current;
    if (!map || isFlyingToCityRef.current) return;

    const zoom = map.getZoom();
    // Проверяем приближение к городу (зум от 9.0)
    if (zoom < 9.0) return;

    const center = map.getCenter();
    let closestCity: City | null = null;
    let minDistance = Infinity;

    for (const c of CITIES) {
      const dist = getDistanceKm(center.lat, center.lng, c.lat, c.lon);
      const radius = getCityRadiusKm(c.slug);
      // Учитываем границы городов и близлежащие пригородные зоны
      if (dist <= radius && dist < minDistance) {
        minDistance = dist;
        closestCity = c;
      }
    }

    const currentActiveSlug = loadingCitySlugRef.current || citySlug;
    if (closestCity && closestCity.slug !== currentActiveSlug) {
      triggerHaptic('light');
      setLoadingCitySlug(closestCity.slug);
      loadingCitySlugRef.current = closestCity.slug;

      // Мгновенно скрываем значок города, когда его мероприятия начинают прогружаться
      cityBadgesRef.current.forEach(({ city: c, el }) => {
        if (c.slug === closestCity.slug || c.slug === currentActiveSlug) {
          el.classList.add('hidden-current-city', 'hidden-zoom');
          el.style.display = 'none';
          el.style.visibility = 'hidden';
        }
      });

      onSelectCity?.(closestCity);
    }
  }, [citySlug, onSelectCity]);

  const eventsByIdRef = useRef<Map<string, EventItem>>(new Map());
  useEffect(() => {
    eventsByIdRef.current = new Map(events.map((e) => [e.id, e]));
  }, [events]);

  // Отрисовка кластеров со счётчиком и круговым градиентом в цвета мероприятий
  const renderClusterMarkers = useCallback(() => {
    const map = mapRef.current;
    const sc = superclusterRef.current;
    if (!map || !sc) return;

    const zoom = map.getZoom();
    const currentActiveCitySlug = loadingCitySlugRef.current || citySlug;
    const cityThreshold = getCityZoomThreshold(currentActiveCitySlug, 25);
    const isZoomedOut = zoom < cityThreshold;

    // Если карта отдалена до уровня городов России — очищаем кластеры
    if (isZoomedOut) {
      clusterMarkersRef.current.forEach((m) => m.remove());
      clusterMarkersRef.current = [];
      return;
    }

    const bounds = map.getBounds();
    const west = Math.max(-180, bounds.getWest());
    const south = Math.max(-85, bounds.getSouth());
    const east = Math.min(180, bounds.getEast());
    const north = Math.min(85, bounds.getNorth());
    const bbox: [number, number, number, number] = [west, south, east, north];

    const intZoom = Math.floor(zoom);
    const clustersAndPoints = sc.getClusters(bbox, intZoom);

    // Удаляем предыдущие маркеры кластеров
    clusterMarkersRef.current.forEach((m) => m.remove());
    clusterMarkersRef.current = [];

    const unclusteredVenues: EventItem[][] = [];

    clustersAndPoints.forEach((feat) => {
      if (feat.properties?.cluster) {
        // Несколько перекрывающихся мероприятий объединяются в метку со счётчиком
        const [lon, lat] = feat.geometry.coordinates as [number, number];
        const clusterId = feat.properties.cluster_id;
        const totalEvents = feat.properties.totalEvents || feat.properties.point_count;
        const colors: string[] = feat.properties.colors || [];

        const conicStyle = buildConicGradientStyle(colors);
        const sizeClass =
          totalEvents >= 20 ? 'size-lg' : totalEvents >= 10 ? 'size-md' : totalEvents >= 5 ? 'size-sm' : 'size-xs';

        const el = document.createElement('div');
        el.className = 'event-cluster-bubble';

        const inner = document.createElement('div');
        inner.className = `cluster-bubble-inner ${sizeClass}`;
        inner.style.background = conicStyle;
        inner.innerHTML = `<span class="cluster-count-text">${totalEvents}</span>`;

        inner.addEventListener('click', (e) => {
          e.stopPropagation();
          triggerHaptic('light');
          const expansionZoom = sc.getClusterExpansionZoom(clusterId);
          map.easeTo({
            center: [lon, lat],
            zoom: Math.min(expansionZoom, 16),
            duration: 600,
            essential: true,
          });
        });

        el.appendChild(inner);

        const marker = new Marker({ element: el })
          .setLngLat([lon, lat])
          .addTo(map);

        clusterMarkersRef.current.push(marker);
      } else {
        // Отдельная площадка (не перекрывается с другими)
        const venueIdx = feat.properties?.venueIndex;
        if (typeof venueIdx === 'number' && venueGroups[venueIdx]) {
          unclusteredVenues.push(venueGroups[venueIdx]);
        }
      }
    });

    // Обновляем видимые одиночные фото-метки на карте (только не вошедшие в кластеры)
    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (source && map.isStyleLoaded()) {
      source.setData(toGeoJSON(unclusteredVenues) as any);
    }
  }, [venueGroups, citySlug]);

  // Инициализация Supercluster для пространственной кластеризации
  useEffect(() => {
    const sc = new Supercluster<any, any>({
      radius: 60,
      maxZoom: CLUSTER_MAX_ZOOM,
      map: (props: any) => ({
        totalEvents: props.eventsCount,
        colors: props.colors,
      }),
      reduce: (acc: any, props: any) => {
        acc.totalEvents = (acc.totalEvents || 0) + (props.totalEvents || 1);
        acc.colors = (acc.colors || []).concat(props.colors || []);
      },
    });

    const venueFeatures = venueGroups.map((group, index) => {
      const item = group[0];
      const colors = group.map((e) => getEventCategoryColor(e.category));
      return {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [item.lon, item.lat] },
        properties: {
          venueIndex: index,
          eventsCount: group.length,
          colors,
          totalEvents: group.length,
        },
      };
    });

    sc.load(venueFeatures);
    superclusterRef.current = sc;
    currentClusterZoomRef.current = -1;
    renderClusterMarkers();
  }, [venueGroups, renderClusterMarkers]);

  // Однократный запрос геолокации при монтировании карты (только для синей точки «Вы здесь»)
  useEffect(() => {
    let isCancelled = false;
    const locate = async () => {
      setIsLocating(true);
      try {
        const result = await detectUserLocation(5000);
        if (isCancelled) return;
        setUserLocation(result);
      } catch (err) {
        console.warn('Geolocation failed:', err);
      } finally {
        if (!isCancelled) setIsLocating(false);
      }
    };

    locate();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Инициализация карты (однократно при монтировании)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialCenter: [number, number] = [city.lon, city.lat];

    const map = new MLMap({
      container: containerRef.current,
      style: PRIMARY_STYLE,
      center: initialCenter,
      zoom: 12.5,
      attributionControl: false,
      renderWorldCopies: false,
      localIdeographFontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fadeDuration: 80,
      maxTileCacheSize: 100,
    });
    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right');

    const handleReady = () => {
      setMapLoaded(true);
      renderClusterMarkers();
      onMapReadyRef.current?.();
    };

    map.on('load', handleReady);
    map.on('idle', () => {
      onMapReadyRef.current?.();
    });

    // Ленивая регистрация по styleimagemissing для одиночных фото-меток и меток с +N
    map.on('styleimagemissing', (e) => {
      if (e.id.startsWith('event-icon-')) {
        const rest = e.id.slice('event-icon-'.length);
        const parts = rest.split('-plus-');
        const itemId = parts[0];
        const plusCount = parts[1] ? parseInt(parts[1], 10) : 0;
        const item = eventsByIdRef.current.get(itemId);
        if (item) {
          registerEventMarker(map, item.id, item.image, item.category, plusCount);
        }
      }
    });

    // Клик по отдельной метке мероприятия с фото (или площадке с несколькими мероприятиями)
    map.on('click', 'event-points', (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      triggerHaptic('selection');
      const itemId = feature.properties?.id;
      const item = eventsByIdRef.current.get(itemId);
      if (item) {
        const venueList = venueEventsMapRef.current.get(itemId) || [item];
        setSelectedVenueEvents(venueList);
        setSelected(item);
      }
    });

    map.on('mouseenter', 'event-points', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'event-points', () => {
      map.getCanvas().style.cursor = '';
    });

    return () => {
      transitionIdRef.current++;
      clusterMarkersRef.current.forEach((m) => m.remove());
      clusterMarkersRef.current = [];
      cityBadgesRef.current.forEach(({ marker }) => marker.remove());
      cityBadgesRef.current = [];
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [renderClusterMarkers]);

  // Двухэтапный плавный переход при смене города: сначала движение к городу, затем приближение
  const prevCitySlugRef = useRef<string>(citySlug);
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    if (prevCitySlugRef.current !== citySlug) {
      prevCitySlugRef.current = citySlug;
      if (!isFlyingToCityRef.current) {
        transitionToCity(city, 12.5);
      }
    }
  }, [city, citySlug, mapLoaded, transitionToCity]);

  // Очистка кэша фото-меток только при переключении на другой город
  useEffect(() => {
    markerCache.clear();
  }, [citySlug]);

  // Интерактивные плашки названий городов при отдалении карты
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Создаем интерактивные плашки названий городов при первом монтировании
    if (cityBadgesRef.current.length === 0) {
      CITIES.forEach((c) => {
        const badge = document.createElement('div');
        badge.className = 'city-boundary-badge';
        badge.innerHTML = `<span class="city-name-text">${c.name}</span>`;
        badge.addEventListener('click', (e) => {
          e.stopPropagation();
          handleSelectCity(c);
        });

        const isCurrentCity = c.slug === citySlug || c.slug === loadingCitySlugRef.current;
        if (isCurrentCity) {
          badge.classList.add('hidden-current-city', 'hidden-zoom');
          badge.style.display = 'none';
          badge.style.visibility = 'hidden';
          badge.style.opacity = '0';
          badge.style.pointerEvents = 'none';
        }

        const marker = new Marker({ element: badge })
          .setLngLat([c.lon, c.lat])
          .addTo(map);

        cityBadgesRef.current.push({ city: c, marker, el: badge });
      });
    }

    // Скрытие значков городов: значок города, в котором пользователь находится (или который активен/прогружается),
    // ВСЕГДА скрывается на 100%. При приближении к городу (или zoom >= динамического порога города) плашки также скрываются.
    const updateVisibility = () => {
      if (!map) return;
      const zoom = map.getZoom();
      const currentActiveCitySlug = loadingCitySlugRef.current || citySlug;
      const cityThreshold = getCityZoomThreshold(currentActiveCitySlug, 25);
      const isZoomedOut = zoom < cityThreshold;
      const center = map.getCenter();

      // Управление видимостью слоя точек мероприятий в зависимости от порога отдаления города
      if (map.getLayer('event-points')) {
        map.setLayoutProperty('event-points', 'visibility', isZoomedOut ? 'none' : 'visible');
      }
      if (map.getLayer('event-points-base')) {
        map.setLayoutProperty('event-points-base', 'visibility', isZoomedOut ? 'none' : 'visible');
      }

      cityBadgesRef.current.forEach(({ city: c, el }) => {
        const isCurrentActive = c.slug === currentActiveCitySlug || c.slug === citySlug;
        const distToCenter = getDistanceKm(center.lat, center.lng, c.lat, c.lon);
        const cityRadius = getCityRadiusKm(c.slug);
        const isCameraInThisCity = distToCenter <= cityRadius;

        // Если это текущий город, или мы в его зоне/границах, или зум не общий — скрываем на 100%
        const shouldHide = isCurrentActive || isCameraInThisCity || !isZoomedOut;

        if (shouldHide) {
          el.classList.add('hidden-current-city', 'hidden-zoom');
          el.style.display = 'none';
          el.style.visibility = 'hidden';
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
        } else {
          el.classList.remove('hidden-current-city', 'hidden-zoom');
          el.style.display = 'inline-flex';
          el.style.visibility = 'visible';
          el.style.opacity = '1';
        }
      });

      if (isZoomedOut) {
        clusterMarkersRef.current.forEach((m) => m.remove());
        clusterMarkersRef.current = [];
      }
    };

    const handleZoom = () => {
      updateVisibility();
      const currentIntZoom = Math.floor(map.getZoom());
      if (currentIntZoom !== currentClusterZoomRef.current) {
        currentClusterZoomRef.current = currentIntZoom;
        renderClusterMarkers();
      }
    };

    const handleMoveEnd = () => {
      checkAutoCitySwitch();
      renderClusterMarkers();
    };

    updateVisibility();
    renderClusterMarkers();
    map.on('zoom', handleZoom);
    map.on('move', updateVisibility);
    map.on('moveend', handleMoveEnd);

    return () => {
      map.off('zoom', handleZoom);
      map.off('move', updateVisibility);
      map.off('moveend', handleMoveEnd);
    };
  }, [citySlug, mapLoaded, handleSelectCity, checkAutoCitySwitch, renderClusterMarkers]);

  // Обновление слоя пользовательской геопозиции («Вы здесь»)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !userLocation?.isExact) return;

    const userGeoJSON: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [userLocation.lon, userLocation.lat],
          },
          properties: { title: 'Вы здесь' },
        },
      ],
    };

    const source = map.getSource(USER_SOURCE_ID) as GeoJSONSource | undefined;
    if (source) {
      source.setData(userGeoJSON as any);
      return;
    }

    if (!map.isStyleLoaded()) return;

    map.addSource(USER_SOURCE_ID, {
      type: 'geojson',
      data: userGeoJSON,
    });

    map.addLayer({
      id: 'user-halo',
      type: 'circle',
      source: USER_SOURCE_ID,
      paint: {
        'circle-radius': 22,
        'circle-color': '#00a8ff',
        'circle-opacity': 0.25,
        'circle-blur': 0.5,
      },
    });

    map.addLayer({
      id: 'user-dot',
      type: 'circle',
      source: USER_SOURCE_ID,
      paint: {
        'circle-radius': 7.5,
        'circle-color': '#00a8ff',
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff',
      },
    });
  }, [userLocation, mapLoaded]);

  // Применение слоя событий (ФОТО НА ВСЮ МЕТКУ + ОБВОДКА В ЦВЕТ МЕРОПРИЯТИЯ + "+N" БЕЙДЖ)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      if (!map || !map.isStyleLoaded()) return;

      // Регистрируем метки для всех площадок (с учетом +N)
      venueGroups.forEach((group) => {
        const item = group[0];
        const additionalCount = group.length - 1;
        registerEventMarker(map, item.id, item.image, item.category, additionalCount);
      });

      const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      if (!source) {
        // Источник событий: некластеризованные одиночные площадки рисуются строго на координатах
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
          cluster: false,
        });

        // 1. Подложка в цвет мероприятия (увеличена на 25%)
        map.addLayer({
          id: 'event-points-base',
          type: 'circle',
          source: SOURCE_ID,
          minzoom: 6.5,
          paint: {
            'circle-color': ['get', 'color'],
            'circle-radius': 27.5, // 22 * 1.25 (+25%)
            'circle-opacity': 0.35,
            'circle-blur': 0.5,
          },
        });

        // 2. МЕТКИ МЕРОПРИЯТИЙ: ФОТО + ОБВОДКА В ЦВЕТ МЕРОПРИЯТИЯ (+N БЕЙДЖ), УВЕЛИЧЕНЫ НА 25%
        map.addLayer({
          id: 'event-points',
          type: 'symbol',
          source: SOURCE_ID,
          minzoom: 6.5,
          layout: {
            'icon-image': ['get', 'icon'],
            'icon-size': 0.60, // 0.48 * 1.25 (+25%)
            'icon-anchor': 'center', // ВСЕГДА строго по центру координат площадки
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
          },
        });
      }

      renderClusterMarkers();
    };

    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once('load', apply);
      map.on('styledata', () => {
        if (map.isStyleLoaded()) apply();
      });
    }
  }, [venueGroups, mapLoaded, renderClusterMarkers]);

  // Кнопка центровки карты на пользователе
  const handleRecenter = useCallback(async () => {
    triggerHaptic('light');
    setIsLocating(true);
    try {
      const loc = await detectUserLocation(5000);
      setUserLocation(loc);
      if (loc.isExact && mapRef.current) {
        mapRef.current.flyTo({
          center: [loc.lon, loc.lat],
          zoom: 13.5,
          essential: true,
          duration: 1200,
        });
        if (loc.city && loc.city.slug !== citySlug) {
          onSelectCity?.(loc.city);
        }
      }
    } catch {
      // Ignore
    } finally {
      setIsLocating(false);
    }
  }, [citySlug, onSelectCity]);

  return (
    <div className="event-map-container">
      <div ref={containerRef} className="event-map-gl" />

      {/* Кнопка центровки карты на пользователе */}
      <button
        className={`map-recenter-btn ${isLocating ? 'locating' : ''}`}
        onClick={handleRecenter}
        aria-label="Мое местоположение"
        title="Моё местоположение"
      >
        <Crosshair size={20} />
      </button>

      {/* Нижняя карточка (Bottom Sheet) выбранного мероприятия */}
      {selected && (
        <div className="map-bottom-card" onClick={() => onSelectEvent(selected)}>
          <button
            className="map-card-close"
            onClick={(e) => {
              e.stopPropagation();
              setSelected(null);
              setSelectedVenueEvents([]);
            }}
            aria-label="Закрыть"
          >
            <X size={16} />
          </button>

          {/* Переключатель мероприятий, если по этому адресу их несколько */}
          {selectedVenueEvents.length > 1 && (
            <div className="map-card-multi-header" onClick={(e) => e.stopPropagation()}>
              <div className="multi-header-tag">
                <MapPin size={12} />
                <span>По этому адресу {selectedVenueEvents.length} мероприятия</span>
              </div>
              <div className="multi-header-switcher">
                {selectedVenueEvents.map((item, idx) => (
                  <button
                    key={item.id}
                    className={`multi-switch-btn ${item.id === selected.id ? 'active' : ''}`}
                    onClick={() => {
                      triggerHaptic('light');
                      setSelected(item);
                    }}
                  >
                    #{idx + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="map-card-content">
            <img src={selected.image} alt={selected.title} className="map-card-thumb" />

            <div className="map-card-body">
              {selected.sourceName && (
                <span className="map-card-source">{selected.sourceName}</span>
              )}
              <h4 className="map-card-title">{selected.title}</h4>
              <div className="map-card-row">
                <Calendar size={13} />
                <span>
                  {new Date(selected.date).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="map-card-row">
                <MapPin size={13} />
                <span className="truncate">{selected.place}</span>
              </div>
            </div>

            <div className="map-card-arrow">
              <ChevronRight size={20} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
