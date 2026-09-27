"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, AsciiRenderer } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

function SkullModel() {
  const { scene } = useGLTF("/models/skull.glb");
  const { camera } = useThree();

  const skullRef = useRef<THREE.Group>(null);
  const jawRef = useRef<THREE.Object3D | null>(null);
  const skullMeshRef = useRef<THREE.Object3D | null>(null);

  // на мобільному череп має бути більшим і нижчим —
  // визначаємо це один раз при монтуванні
  const isMobileRef = useRef(false);

  useEffect(() => {
    isMobileRef.current = window.innerWidth <= 800;
  }, []);

  // DOM-елемент .skull-wrapper (з page.tsx) — керуємо його
  // z-index напряму з useFrame, щоб череп міняв шар (перед
  // текстом / за текстом) залежно від прогресу скролу.
  const skullWrapperElRef = useRef<HTMLElement | null>(null);

  const scrollTarget = useRef(0);
  const scrollCurrent = useRef(0);

  useEffect(() => {
    skullWrapperElRef.current =
      document.querySelector(".skull-wrapper");

    // У цій моделі щелепа названа "Cube" (дефолтна назва
    // з Blender, просто не перейменували перед експортом),
    // а не "jaw". Шукаємо саме її.
    //
    // Окремо знаходимо і сам меш "skull" (верхню частину) —
    // він теж злегка "прочиняється" під час укусу, в
    // протилежний бік від щелепи.
    scene.traverse((object) => {
      if (object.name === "Cube") {
        jawRef.current = object;
      }

      if (object.name === "skull") {
        skullMeshRef.current = object;
      }
    });

    /*
      =========================
      ЩЕЛЕПА ТРОХИ ТЕМНІША
      =========================

      На відміну від MeshBasicMaterial (яка ВИМИКАЄ реакцію
      на світло повністю), тут лишаємо оригінальний матеріал
      моделі — щелепа й далі отримує тіні/відблиски як
      звичайно, просто її БАЗОВИЙ колір притлумлений.

      Клонуємо матеріал (щоб не зачепити інші частини моделі,
      якщо матеріал десь спільний), множимо колір на
      JAW_DARKEN (0–1):
        1    → без змін
        0.5  → вдвічі темніший базовий колір
        0.2  → значно темніший, майже чорний
    */

    const JAW_DARKEN = 0.3;

    if (jawRef.current) {
      jawRef.current.traverse((child) => {
        const mesh = child as THREE.Mesh;

        if (!mesh.isMesh || !mesh.material) return;

        // на випадок кількох матеріалів на одному меші
        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];

        const darkened = materials.map((mat) => {
          /*
            =========================
            ЗАХИСТ ВІД ПОВТОРНОГО ЗАТЕМНЕННЯ
            =========================

            useGLTF кешує scene глобально — це той самий
            об'єкт при кожному повторному монтуванні компонента
            (наприклад, коли повертаєшся на головну сторінку
            без повного перезавантаження). Без цього захисту
            кожне монтування клонувало б УЖЕ затемнений
            матеріал і множило б колір ще раз, тому щелепа
            ставала б дедалі чорнішою.

            Зберігаємо посилання на ОРИГІНАЛЬНИЙ, ще не
            затемнений матеріал у userData і завжди клонуємо
            саме від нього, а не від поточного (можливо вже
            затемненого) стану.
          */
          const original =
            (mat.userData.__originalMaterial as
              THREE.MeshStandardMaterial | undefined) ??
            (mat as THREE.MeshStandardMaterial);

          const cloned = original.clone();
          cloned.userData.__originalMaterial = original;

          if (cloned.color) {
            cloned.color.multiplyScalar(JAW_DARKEN);
          }

          return cloned;
        });

        mesh.material = Array.isArray(mesh.material)
          ? darkened
          : darkened[0];
      });
    }

    /*
      =========================
      ЛОКАЛЬНИЙ ПРОГРЕС СКРОЛУ (не глобальний!)
      =========================

      Раніше тут був window.scrollY / documentHeight — прогрес
      від скролу ВСІЄЇ сторінки. Проблема: чим більше секцій
      додається нижче (паспорт і т.д.), тим більший стає
      загальний скрол сторінки, тим МЕНШУ частку від нього
      займає сама .hero — тобто анімація черепа фізично
      "стискається" й перестає встигати розкритись, хоча
      сам .hero не змінювався.

      Тепер прогрес рахується ЛОКАЛЬНО від самої .hero-секції
      (getBoundingClientRect), точно як у PassportScroll —
      p=0 на самому початку .hero, p=1 рівно коли sticky-блок
      "відліплюється" в кінці .hero. Додавання будь-яких
      секцій нижче більше ніяк на це не впливає.
    */

    const updateScroll = () => {
      const heroEl = document.querySelector(".hero");

      if (!heroEl) {
        scrollTarget.current = 0;
        return;
      }

      const rect = heroEl.getBoundingClientRect();
      const vh = window.innerHeight;

      // скільки пікселів можна проскролити ВСЕРЕДИНІ .hero,
      // поки sticky-блок лишається "приклеєним"
      const scrollableDistance = rect.height - vh;

      if (scrollableDistance <= 0) {
        scrollTarget.current = 0;
        return;
      }

      // rect.top = 0, коли верх .hero рівно на верху екрана
      const scrolled = -rect.top;

      scrollTarget.current = Math.min(
        1,
        Math.max(0, scrolled / scrollableDistance)
      );
    };

    window.addEventListener("scroll", updateScroll);
    window.addEventListener("resize", updateScroll);

    updateScroll();

    return () => {
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
    };
  }, [scene]);

  useFrame(() => {
    if (!skullRef.current) return;

    /*
      Плавність самої анімації.
      Менше число = повільніше та плавніше (більша затримка
      за скролом). Більше число = швидша реакція, ближче
      до "миттєво" (0.4-0.5 — майже без згладжування,
      1 = взагалі без плавності, миттєво стрибає).
    */

    scrollCurrent.current +=
      (scrollTarget.current - scrollCurrent.current) * 0.18;

    const p = scrollCurrent.current;

    /*
      =========================
      FREEZE POINT
      =========================

      Після FREEZE_AT анімація черепа перестає реагувати
      на подальший скрол — всі криві нижче використовують
      animP замість "сирого" p, а animP більше не росте
      після цього порогу.

      FREEZE_AT задано у тих самих одиницях, що й p —
      частка від скролу ВСЕРЕДИНІ .hero (0 = самий верх .hero,
      1 = кінець .hero, коли sticky-блок відліплюється). Тепер
      це НЕ залежить від секцій нижче — лише від висоти самої
      .hero (height у globals.css).

      Якщо хочете, щоб уся анімація (включно з укусом щелепи,
      поріг 0.88) встигала повністю відіграти ДО заморозки —
      ставте FREEZE_AT >= 0.88. Якщо хочете заморозити
      анімацію "на півслові" — ставте менше значення,
      і череп зупиниться в проміжному стані.
    */

    const FREEZE_AT = 0.99;
    const animP = Math.min(p, FREEZE_AT);
    const mouthP = p;

    /*
      =========================
      Z-INDEX: ЧЕРЕП ЗА / ПЕРЕД ТЕКСТОМ
      =========================

      hero-title (сам текст імені) має z-index: 3 в CSS.
      Тут напряму керуємо z-index контейнера .skull-wrapper:
        до SWAP_AT   → нижче за текст (SKULL_Z_BEHIND = 2),
                        череп візуально ЗА буквами
        після SWAP_AT → вище за текст (SKULL_Z_FRONT = 5),
                        череп візуально ПЕРЕД буквами

      SWAP_AT — той самий "p"/animP (0–1, частка від скролу
      ВСЕРЕДИНІ .hero), що і всюди вище.
      Підбирай дослідно, скролячи сторінку до потрібного
      моменту — наприклад, щоб перемикання співпадало з
      моментом укусу (десь між BITE_OPEN_END і BITE_CLOSE_END
      нижче).
    */

    const SWAP_AT = 0.78;
    const SKULL_Z_BEHIND = 2;
    const SKULL_Z_FRONT = 5;

    /*
      =========================
      ВИДИМІСТЬ ДО ПОЧАТКУ СКРОЛУ
      =========================

      При p=0 scale все одно дорівнює 0.005 (не 0), тому
      модель фізично існує в кадрі — на деяких екранах/
      масштабах ASCII-рендер може показати випадковий
      "уламок" символів ще до того, як людина взагалі
      почала скролити.

      Тому окремо ховаємо DOM-обгортку (.skull-wrapper)
      через opacity, поки animP не перетне невеликий поріг
      FADE_IN_AT — тобто поки скрол практично відсутній.
      Одразу після цього порогу швидко проявляємо (вузький
      діапазон smoothstep = майже миттєва, але не різка
      поява).
    */

    const FADE_IN_AT = 0.02;

    if (skullWrapperElRef.current) {
      skullWrapperElRef.current.style.zIndex = String(
        animP > SWAP_AT ? SKULL_Z_FRONT : SKULL_Z_BEHIND
      );

      const visibility = THREE.MathUtils.smoothstep(
        animP,
        0,
        FADE_IN_AT
      );

      skullWrapperElRef.current.style.opacity = String(visibility);
    }

    /*
      =========================
      SHARED PROGRESS
      =========================

      Раніше scale і position рахувались по РІЗНИХ кривих
      (0.02–0.75 і 0–1). Через це в середині скролу череп
      встигав вирости майже до максимуму, але ще не встигав
      опуститись вниз — верхівка моделі вилазила за межі
      frustum камери і "зникала" (крізь прозорий canvas
      було видно фон сторінки).

      Тепер scale і position йдуть по ОДНІЙ кривій, тому
      модель ніколи не буває "велика, але ще не опущена".
    */

    const progress = THREE.MathUtils.smoothstep(
      animP,
      0.02,
      0.85
    );

    /*
      =========================
      SCALE
      =========================
    */

    const MAX_SCALE = isMobileRef.current ? 1.8 : 1.1;

    const scale = THREE.MathUtils.lerp(
      0.005,
      MAX_SCALE,
      progress
    );

    skullRef.current.scale.setScalar(scale);

    /*
      =========================
      POSITION
      =========================
    */

    const POSITION_Y_START = isMobileRef.current ? 0.3 : 0.45;
    const POSITION_Y_END = isMobileRef.current ? -1.15 : -1.8;

    // на різних мобільних екранах aspect ratio відрізняється,
    // тому camera.position.z теж різна (див. SkullScene) —
    // масштабуємо Y так само, як X, щоб череп опинявся
    // в одному й тому ж візуальному місці на будь-якому екрані
    const Y_BASE_Z = 6;
    const yZoomMultiplier = isMobileRef.current
      ? camera.position.z / Y_BASE_Z
      : 1;

    skullRef.current.position.y =
      THREE.MathUtils.lerp(
        POSITION_Y_START,
        POSITION_Y_END,
        progress
      ) * yZoomMultiplier;

    /*
      Трохи рухаємо череп по X,
      щоб він не виглядав статичним.

      CENTER_OFFSET_X підібраний під BASE_Z=6 (десктопна
      відстань камери). На вузьких (портретних) екранах
      камера відсувається далі (див. SkullScene нижче),
      тому масштабуємо зсув пропорційно до поточної
      відстані камери, щоб він виглядав однаково на
      будь-якому aspect ratio.
    */

const BASE_Z = 6;
const OFFSET_ZOOM_CAP = 1.6; // зсув по X більше не росте безмежно, коли камера відлітає далеко на вузьких екранах
const MOBILE_CENTER_OFFSET_X = 0.2; // на мобільному центруємо без зсуву — на десктопі зсув компенсує rotation.y, але на вузькому екрані він же й штовхає череп вбік
const centerOffsetX = isMobileRef.current ? MOBILE_CENTER_OFFSET_X : CENTER_OFFSET_X;
const offsetMultiplier = Math.min(camera.position.z / BASE_Z, OFFSET_ZOOM_CAP);
const scaledOffsetX = centerOffsetX * offsetMultiplier;

skullRef.current.position.x =
  THREE.MathUtils.lerp(
    0,
    -0.2,
    progress
  ) + scaledOffsetX;

    /*
      =========================
      ROTATION
      =========================
    */

    skullRef.current.rotation.y =
      THREE.MathUtils.lerp(
        4.75,
        4.75,
        THREE.MathUtils.smoothstep(
          animP,
          0.15,
          0.8
        )
      );

    /*
      =========================
      JAW — BITE
      =========================

      Раніше щелепа просто плавно відкривалась і лишалась
      відкритою. Для ефекту "вкусив ім'я" потрібен трикутний
      рух: відкрити → швидко закрити (снеп), саме в той момент,
      коли зуби вже опинились над текстом.

      BITE_OPEN_START..BITE_OPEN_END — фаза відкриття.
      BITE_OPEN_END..BITE_CLOSE_END  — фаза швидкого закриття
      (вузький діапазон = різкий, "хижий" рух, а не млявий).

      FREEZE_AT (вище) має бути >= BITE_CLOSE_END, інакше
      заморозка спіймає момент ще до того, як щелепа встигне
      повністю зімкнутись.

      Підбирайте BITE_OPEN_END так, щоб САМЕ в цей момент
      скролу зуби на екрані виявлялись над потрібним словом/
      літерами імені (простіше підганяти, зіскроливши сторінку
      рівно до цього відсотка й дивлячись, де зараз зуби).
    */

    const BITE_OPEN_START = 0.25;
    const BITE_OPEN_END = 0.7;
    const BITE_CLOSE_END = 0.84;

    if (jawRef.current) {
      const openAmount = THREE.MathUtils.smoothstep(
        animP,
        BITE_OPEN_START,
        BITE_OPEN_END
      );

      const closeAmount = THREE.MathUtils.smoothstep(
        animP,
        BITE_OPEN_END,
        BITE_CLOSE_END
      );

      // трикутний рух: росте до 1, потім різко падає до 0
      const jawOpenness = openAmount * (1 - closeAmount);

      /*
        =========================
        ВІСЬ ОБЕРТАННЯ ЩЕЛЕПИ
        =========================

        rotation.x / rotation.y / rotation.z — це три РІЗНІ
        осі локального обертання об'єкта "Cube". Яка з них
        відповідає за "відкрити рот вниз" залежить від того,
        як модель орієнтована у файлі — заздалегідь не
        вгадати, треба підбирати дослідно.

        Зараз стоїть rotation.x — судячи з опису, у вас це
        дає поворот вбік. Спробуйте по черзі закоментувати/
        розкоментувати три варіанти нижче (лишіть активним
        лише один), поки рух не стане схожим на відкриття
        рота вниз-вперед:
      */

      const JAW_ANGLE = THREE.MathUtils.lerp(
        0,
        -0.9,
        jawOpenness
      );

      jawRef.current.rotation.x = 0;
      jawRef.current.rotation.y = 0;
      jawRef.current.rotation.z = 0;

      // варіант 1 — розкоментуй, щоб спробувати
      // jawRef.current.rotation.x = JAW_ANGLE;

      // варіант 2 — розкоментуй, щоб спробувати
      // jawRef.current.rotation.y = JAW_ANGLE;

      // варіант 3 — розкоментуй, щоб спробувати
      jawRef.current.rotation.z = JAW_ANGLE;

      /*
        Якщо рух по потрібній осі є, але йде НЕ В ТОЙ БІК
        (рот "закривається назовні" чи заходить у череп) —
        просто поміняй знак: -0.5 → 0.5 (або навпаки) вище
        у THREE.MathUtils.lerp(0, -0.5, jawOpenness).

        Якщо рух по всіх трьох осях виглядає як "поворот
        навколо неправильної точки" (щелепа крутиться десь
        збоку, а не навколо завіси/суглоба) — це вже не
        питання осі, а того, де в моделі стоїть pivot/origin
        об'єкта Cube. Це виправляється тільки в самому файлі
        (Blender: Object → Set Origin → перемістити 3D Cursor
        у точку суглоба щелепи, потім Origin to 3D Cursor),
        код тут вже нічого не зробить.
      */
    }

    /*
      =========================
      ВЕРХНЯ ЧАСТИНА (skull) — ДЗЕРКАЛЬНИЙ РУХ
      =========================

      Той самий jawOpenness, та сама вісь (тут z, бо саме
      її ми підібрали для щелепи вище) — але:
        1) протилежний знак (тому й "в інший бік")
        2) значно менша амплітуда (0.5 → 0.12), бо верхня
           частина має тільки трохи "піднятись", а не
           розкритись так само сильно, як щелепа

      Якщо змінюєш вісь для щелепи (варіант 1/2/3 вище) —
      онови тут таку саму вісь, інакше вони рухатимуться
      "врізнобіч" по різних осях і виглядатиме дивно.
    */

    if (skullMeshRef.current && jawRef.current) {
      const openAmount = THREE.MathUtils.smoothstep(
        animP,
        BITE_OPEN_START,
        BITE_OPEN_END
      );

      const closeAmount = THREE.MathUtils.smoothstep(
        animP,
        BITE_OPEN_END,
        BITE_CLOSE_END
      );

      const jawOpenness = openAmount * (1 - closeAmount);

      const SKULL_TILT_AMOUNT = 0.12; // менше за 0.5 щелепи

      const skullTiltAngle = THREE.MathUtils.lerp(
        0,
        SKULL_TILT_AMOUNT, // протилежний ЗНАК до -0.5 щелепи
        jawOpenness
      );

      skullMeshRef.current.rotation.x = 0;
      skullMeshRef.current.rotation.y = 0;
      skullMeshRef.current.rotation.z = 0;

      // та сама вісь, що активна вище для щелепи (варіант 3)
      skullMeshRef.current.rotation.z = skullTiltAngle;
    }
  });

  return (
    <group ref={skullRef}>
      <primitive object={scene} />
    </group>
  );
}

/*
  Перемикач для налаштування світла:
  true  — звичайна ASCII-версія (те, що бачить користувач)
  false — звичайний "сирий" 3D-рендер без ASCII, щоб зручно
          дивитись, як насправді лягає світло/тіні на моделі

  Просто зміни на false, поправ intensity/position світла,
  подивись наживо як лягли тіні, поверни назад на true.
*/
const SHOW_ASCII = true;

/*
  =========================
  ASCII_SIZE
  =========================

  Розмір символів. Це те саме, що проп resolution у
  AsciiRenderer, просто винесено окремою змінною, щоб
  швидко крутити, не лазячи в JSX нижче.

  МЕНШЕ число  → символи БІЛЬШІ й грубіші (менше деталей,
                 наприклад 0.08–0.12)
  БІЛЬШЕ число → символи МЕНШІ й дрібніші (більше деталей,
                 наприклад 0.3–0.4)

  Логіка: це фактично роздільна здатність внутрішнього
  "растру", з якого будуються символи — що вища роздільна
  здатність, то більше клітинок влазить в те саме місце
  на екрані, то дрібнішим виходить кожен символ.
*/
const ASCII_SIZE = 0.3;

/*
  =========================
  CENTER_OFFSET_X
  =========================

  Компенсація горизонтального зсуву. Причина зсуву — не CSS,
  а сама 3D-модель: rotation.y нижче стала (4.75 рад), і якщо
  "точка обертання" (pivot/origin) у .glb-файлі не рівно по
  центру черепа, поворот на такий кут візуально відсуває
  силует убік, хоч position.x і лишається 0.

  Значення підібрано під BASE_Z=6 (десктопна відстань
  камери) — масштабується пропорційно всередині SkullModel
  для будь-якого aspect ratio.

  Додаємо/віднімаємо тут, поки череп не стане рівно під
  центром напису. Додатне число зсуває ВПРАВО, від'ємне —
  ВЛІВО (стандартна вісь X в Three.js).
*/
const CENTER_OFFSET_X = 0.35;

/*
  =========================
  CONTRAST
  =========================

  Одна змінна замість ручного редагування рядка символів.

  ВАЖЛИВО: це НЕ дзеркальна шкала. Темне (тіні, чорні
  ділянки) завжди лишається щільним і добре видимим — бо
  fgColor темний і на світлому фоні сторінки це те, що
  власне й повинно бути видно. Порожнім (пробіл, зливається
  зі світлим фоном сторінки) стає ТІЛЬКИ найяскравіше.

  0    — плавний перехід від щільного (темне) до порожнього
         (яскраве), м'який градієнт
  1    — майже бінарно: або повна густота (темне), або
         повна порожнеча (яскраве), різкий поріг

  Просто міняй це число і дивись результат.
*/
const CONTRAST = 0.2;

/*
  Ряд символів від НАЙГУСТІШОГО (для темного) до "рідкого"
  (для світлого, ближче до порожнечі). Порядок важливий —
  перший символ відповідає темним ділянкам моделі.
*/
const DENSITY_RAMP = "#*+=-:.";

function buildAsciiCharacters(contrast: number) {
  // contrast стискає середину рампи ближче до країв:
  // при contrast=1 залишається майже тільки перший
  // (щільний) і останній (порожній) символи
  const steps = DENSITY_RAMP.length;
  const keep = Math.max(
    2,
    Math.round(steps * (1 - contrast))
  );

  const trimmed = DENSITY_RAMP.slice(0, keep);

  // скільки пробілів додати В КІНЕЦЬ (тільки з боку
  // яскравого) — чим вищий contrast, тим ширше поле
  // повної порожнечі на відблисках
  const extraBlankPad = " ".repeat(
    Math.round(contrast * steps * 1.5)
  );

  return trimmed + extraBlankPad;
}

const ASCII_CHARACTERS = buildAsciiCharacters(CONTRAST);

export default function SkullScene() {
  /*
    =========================
    АДАПТИВНА ВІДСТАНЬ КАМЕРИ
    =========================

    fov — вертикальний кут огляду. На вузьких (портретних)
    екранах горизонтальний кут огляду звужується пропорційно
    до aspect = width/height контейнера, тому при тій самій
    position.z на телефоні видно вужчу смугу по X — череп
    обрізається справа/зліва.

    Відсуваємо камеру далі (більший z), коли aspect контейнера
    менший за REFERENCE_ASPECT (те співвідношення, під яке
    підібрані всі інші налаштування — десктоп, широкий кадр).
  */

  const [cameraZ, setCameraZ] = useState(6);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const REFERENCE_ASPECT = 1.6; // приблизний desktop aspect, під який підібрано z=6
    const BASE_Z = 6;

const updateCameraZ = () => {
  const el = wrapperRef.current;
  if (!el) return;

  const { width, height } = el.getBoundingClientRect();
  if (width === 0 || height === 0) return;

  const aspect = width / height;

  const z =
    aspect < REFERENCE_ASPECT
      ? BASE_Z * (REFERENCE_ASPECT / aspect)
      : BASE_Z;

  setCameraZ(z);
};

    updateCameraZ();

    // на iOS Safari адресний рядок згортається/розгортається після
    // завантаження, через що innerHeight (і aspect) в перший момент
    // може бути неточним — перераховуємо ще раз через невелику
    // затримку, коли layout уже "усівся"
    const settleTimer = setTimeout(updateCameraZ, 300);

    window.addEventListener("resize", updateCameraZ);

    // visualViewport точніше за window.resize відстежує зміни
    // висоти екрана на iOS (згортання адресного рядка тощо)
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", updateCameraZ);
    }

    return () => {
      clearTimeout(settleTimer);
      window.removeEventListener("resize", updateCameraZ);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", updateCameraZ);
      }
    };
  }, []);

   return (
    <div ref={wrapperRef} style={{ width: "100%", height: "100%" }}>
      <Canvas
        camera={{
          position: [0, 0, cameraZ],
          fov: 40,
        }}
        /*
          dpr=[1,2] (адаптивний до Retina) вимикаємо в
          ASCII-режимі: AsciiEffect рахує розмір символів від
          "буферних" пікселів рендерера, а не від CSS-розміру
          контейнера. На екранах з dpr=2 буфер вдвічі більший
          за контейнер — символи виходять фізично ширшими за
          нього, центрування "не встигає", і все їде вліво.
          dpr=1 прибирає цю розбіжність. У звичайному (не-ASCII)
          режимі лишаємо адаптивний dpr для чіткішої картинки.
        */
        dpr={SHOW_ASCII ? 1 : [1, 2]}
        gl={{
          antialias: true,
          alpha: true,
        }}
        style={{
          width: "100%",
          height: "100%",
        }}
      >
        {/*
          ambient знижено — воно "підсвічує" все рівномірно,
          тому саме воно не давало тіням стати по-справжньому
          темними (піднімало мінімальну яскравість "підлоги").

          fill (друге directionalLight) теж знижено — воно
          підсвічувало більшу частину поверхні з іншого боку,
          тому світлих ділянок було багато. Менше fill = менше
          площі взагалі потрапляє у світло.

          Основне (key) directionalLight підняте — та частина
          поверхні, що й так була повернута до нього, тепер
          світиться яскравіше, а решта (без fill) лишається
          темною.
        */}
        <ambientLight intensity={0.01} />

        <directionalLight
          position={[4, 5, 2]}
          intensity={7}
        />

        <directionalLight
          position={[-3, 2, -2]}
          intensity={0.15}
        />

        {/*
          Фон видно лише в ASCII-режимі (де він потрібен для
          конвертації в символи). У "сирому" режимі лишаємо
          прозорим, щоб бачити модель на тлі сторінки як завжди.

          ВАЖЛИВО: колір фону має мапитись на ПОРОЖНІЙ символ,
          інакше сам фон "з'їдає" весь екран символами разом
          з тінями на моделі.

          Зараз DENSITY_RAMP влаштований так: темне → щільний
          символ (видно), світле → порожньо. Тому фон сцени
          зроблений БІЛИМ (світлий = порожньо), а не чорним —
          інакше фон, як і тіні на черепі, теж вважався б
          "темним" і теж заповнювався б символами.

          Щільними символами лишаються ТІЛЬКИ справді темні
          ділянки самого черепа (очниці, тіні під щелепою) —
          решта екрана порожня і крізь неї видно фон сторінки.
        */}
        {SHOW_ASCII && (
          <color attach="background" args={["#ffffff"]} />
        )}

        <SkullModel />

        {SHOW_ASCII && (
          <AsciiRenderer
            fgColor="#171717"
            bgColor="transparent"
            /*
              Ряд символів НЕ дзеркальний: темне → щільний
              символ (видно), світле → порожньо (зливається
              з фоном сторінки/сцени). Форма рампи й ширина
              переходу керуються змінною CONTRAST вгорі файлу.
            */
            characters={ASCII_CHARACTERS}
            resolution={ASCII_SIZE}
          />
        )}
      </Canvas>
    </div>
  );
}

useGLTF.preload("/models/skull.glb");