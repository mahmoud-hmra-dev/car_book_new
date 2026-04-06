import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'
import env from '@/config/env.config'

const strings = new LocalizedStrings({
  fr: {
    // Hero
    HERO_TITLE: 'A propos de nous',
    BREADCRUMB_HOME: 'Accueil',
    BREADCRUMB_ABOUT: 'A propos de nous',

    // Features section
    FEATURES_HEADING: 'Chaque trajet devient extraordinaire',
    FEATURE_VARIETY_TITLE: 'Marques variees',
    FEATURE_VARIETY_DESC: `Choisissez parmi une large gamme de marques et modeles de vehicules chez ${env.WEBSITE_NAME}. Des compactes economiques aux SUV de luxe, trouvez la voiture ideale pour chaque occasion.`,
    FEATURE_SUPPORT_TITLE: 'Support exceptionnel',
    FEATURE_SUPPORT_DESC: 'Notre equipe de support dediee est disponible 24h/24, 7j/7 pour vous aider a chaque etape. Des questions de reservation a l\'assistance routiere, nous sommes toujours la pour vous.',
    FEATURE_FREEDOM_TITLE: 'Liberte maximale',
    FEATURE_FREEDOM_DESC: 'Profitez d\'une flexibilite totale avec des politiques d\'annulation souples, un kilometrage illimite et la possibilite de modifier vos plans a tout moment.',
    FEATURE_FLEXIBILITY_TITLE: 'Flexibilite en deplacement',
    FEATURE_FLEXIBILITY_DESC: 'Gerez votre reservation en toute simplicite grace a notre application mobile. Reservez, modifiez ou prolongez votre location en quelques clics, ou que vous soyez.',

    // Video section
    VIDEO_ALT: 'Decouvrez notre flotte',

    // Stats section
    STAT_CUSTOMERS_VALUE: '20k+',
    STAT_CUSTOMERS_LABEL: 'Clients satisfaits',
    STAT_CARS_VALUE: '540+',
    STAT_CARS_LABEL: 'Nombre de voitures',
    STAT_EXPERIENCE_VALUE: '25+',
    STAT_EXPERIENCE_LABEL: 'Annees d\'experience',

    // Unlock memories section
    UNLOCK_HEADING: 'Creez des souvenirs inoubliables sur la route',
    UNLOCK_DESC: `Chez ${env.WEBSITE_NAME}, nous croyons que chaque voyage raconte une histoire. Notre mission est de vous offrir la voiture ideale pour ecrire la votre.`,
    UNLOCK_ITEM1_TITLE: 'Vehicules premium',
    UNLOCK_ITEM1_DESC: 'Chaque voiture de notre flotte est soigneusement entretenue et inspectee pour garantir votre confort et votre securite.',
    UNLOCK_ITEM2_TITLE: 'Prix transparents',
    UNLOCK_ITEM2_DESC: 'Pas de frais caches ni de surprises. Ce que vous voyez est ce que vous payez, avec des tarifs competitifs garantis.',
    UNLOCK_ITEM3_TITLE: 'Prise en charge facile',
    UNLOCK_ITEM3_DESC: 'Des processus de prise en charge et de restitution simplifies pour que vous puissiez prendre la route en quelques minutes.',
    UNLOCK_ITEM4_TITLE: 'Couverture d\'assurance',
    UNLOCK_ITEM4_DESC: 'Roulez l\'esprit tranquille avec nos options d\'assurance completes incluses dans chaque reservation.',

    // Download app section
    DOWNLOAD_LABEL: 'TELECHARGER L\'APPLICATION SUR',
    DOWNLOAD_HEADING: 'Telechargez notre application',
    DOWNLOAD_DESC: 'Reservez votre prochaine voiture de location directement depuis votre telephone. Disponible sur iOS et Android.',
    APP_STORE: 'App Store',
    GOOGLE_PLAY: 'Google Play',

    // Testimonials section
    TESTIMONIALS_HEADING: 'Avis de nos clients',
    TESTIMONIAL1_TEXT: 'Service exceptionnel ! La voiture etait impeccable et le processus de reservation etait incroyablement fluide. Je recommande vivement pour tous vos besoins de location.',
    TESTIMONIAL1_NAME: 'Marie Dupont',
    TESTIMONIAL2_TEXT: 'Le meilleur service de location de voitures que j\'ai utilise. Des prix imbattables et un service client fantastique. Je ne louerai plus ailleurs.',
    TESTIMONIAL2_NAME: 'Jean Martin',
    TESTIMONIAL3_TEXT: 'Tres impressionnee par la qualite des vehicules et le professionnalisme du personnel. Mon experience a ete parfaite du debut a la fin.',
    TESTIMONIAL3_NAME: 'Sophie Bernard',

    // FAQ section
    FAQ_HEADING: 'Questions frequentes sur la location de voitures',
    FAQ1_QUESTION: 'Quels documents sont necessaires pour louer un vehicule ?',
    FAQ1_ANSWER: 'Vous aurez besoin d\'un permis de conduire valide, d\'une carte de credit pour le paiement et le depot de garantie, et d\'une preuve d\'assurance. Les exigences supplementaires peuvent varier selon le lieu et le type de vehicule.',
    FAQ2_QUESTION: 'Proposez-vous des services de livraison et de restitution ?',
    FAQ2_ANSWER: 'Oui ! Nous proposons des services de livraison et de restitution pratiques dans divers endroits, y compris les aeroports et les hotels. Indiquez-nous simplement votre lieu prefere.',
    FAQ3_QUESTION: 'Y a-t-il un age minimum pour louer un vehicule ?',
    FAQ3_ANSWER: 'Oui, l\'age minimum requis est generalement de 21 ans. Certains lieux peuvent avoir des exigences d\'age differentes ou des restrictions supplementaires pour certains types de vehicules.',
    FAQ4_QUESTION: 'Que se passe-t-il si je dois annuler ma reservation ?',
    FAQ4_ANSWER: 'Nous proposons des politiques d\'annulation flexibles. Selon le delai d\'annulation, des frais peuvent s\'appliquer. Consultez nos conditions generales ou contactez notre equipe de support.',
    FAQ5_QUESTION: 'L\'assurance est-elle incluse dans le prix de location ?',
    FAQ5_ANSWER: 'Une assurance de base est incluse dans toutes nos locations. Des options de couverture supplementaires sont disponibles pour une protection accrue et une tranquillite d\'esprit totale.',

    // CTA section
    CTA_HEADING: 'Vous cherchez une voiture ?',
    CTA_PHONE: '+537 547-6401',
    CTA_BOOK_NOW: 'Reserver maintenant',
  },
  en: {
    // Hero
    HERO_TITLE: 'About Us',
    BREADCRUMB_HOME: 'Home',
    BREADCRUMB_ABOUT: 'About Us',

    // Features section
    FEATURES_HEADING: 'Where every drive feels extraordinary',
    FEATURE_VARIETY_TITLE: 'Variety Brands',
    FEATURE_VARIETY_DESC: `Choose from a wide range of vehicle brands and models at ${env.WEBSITE_NAME}. From fuel-efficient compacts to luxury SUVs, find the perfect car for every occasion.`,
    FEATURE_SUPPORT_TITLE: 'Awesome Support',
    FEATURE_SUPPORT_DESC: 'Our dedicated support team is available 24/7 to help you every step of the way. From booking questions to roadside assistance, we are always here for you.',
    FEATURE_FREEDOM_TITLE: 'Maximum Freedom',
    FEATURE_FREEDOM_DESC: 'Enjoy total flexibility with easy cancellation policies, unlimited mileage options, and the freedom to change your plans at any time.',
    FEATURE_FLEXIBILITY_TITLE: 'Flexibility On The Go',
    FEATURE_FLEXIBILITY_DESC: 'Manage your rental effortlessly with our mobile app. Book, modify, or extend your rental in just a few taps, wherever you are.',

    // Video section
    VIDEO_ALT: 'Explore our fleet',

    // Stats section
    STAT_CUSTOMERS_VALUE: '20k+',
    STAT_CUSTOMERS_LABEL: 'Happy customers',
    STAT_CARS_VALUE: '540+',
    STAT_CARS_LABEL: 'Count of cars',
    STAT_EXPERIENCE_VALUE: '25+',
    STAT_EXPERIENCE_LABEL: 'Years of experience',

    // Unlock memories section
    UNLOCK_HEADING: 'Unlock unforgettable memories on the road',
    UNLOCK_DESC: `At ${env.WEBSITE_NAME}, we believe every journey tells a story. Our mission is to provide you with the perfect car to write yours.`,
    UNLOCK_ITEM1_TITLE: 'Premium vehicles',
    UNLOCK_ITEM1_DESC: 'Every car in our fleet is carefully maintained and inspected to ensure your comfort and safety on every trip.',
    UNLOCK_ITEM2_TITLE: 'Transparent pricing',
    UNLOCK_ITEM2_DESC: 'No hidden fees or surprises. What you see is what you pay, with competitive rates guaranteed.',
    UNLOCK_ITEM3_TITLE: 'Easy pickup',
    UNLOCK_ITEM3_DESC: 'Streamlined pickup and drop-off processes so you can hit the road within minutes of arriving.',
    UNLOCK_ITEM4_TITLE: 'Insurance coverage',
    UNLOCK_ITEM4_DESC: 'Drive with peace of mind with our comprehensive insurance options included in every rental.',

    // Download app section
    DOWNLOAD_LABEL: 'DOWNLOAD APP ON',
    DOWNLOAD_HEADING: 'Download our app',
    DOWNLOAD_DESC: 'Book your next rental car right from your phone. Available on iOS and Android for a seamless experience.',
    APP_STORE: 'App Store',
    GOOGLE_PLAY: 'Google Play',

    // Testimonials section
    TESTIMONIALS_HEADING: 'Reviews from our customers',
    TESTIMONIAL1_TEXT: 'Exceptional service! The car was spotless and the booking process was incredibly smooth. Highly recommend for all your rental needs.',
    TESTIMONIAL1_NAME: 'Sarah Johnson',
    TESTIMONIAL2_TEXT: 'Best car rental service I have ever used. Unbeatable prices and fantastic customer service. I won\'t rent from anywhere else.',
    TESTIMONIAL2_NAME: 'Michael Chen',
    TESTIMONIAL3_TEXT: 'Very impressed with the quality of vehicles and the professionalism of the staff. My experience was flawless from start to finish.',
    TESTIMONIAL3_NAME: 'Emily Rodriguez',

    // FAQ section
    FAQ_HEADING: 'Top Car Rental Questions',
    FAQ1_QUESTION: 'What documents do I need to rent a vehicle?',
    FAQ1_ANSWER: 'To rent a vehicle, you will typically need a valid driver\'s license, a credit card for payment and security deposit, and proof of insurance. Additional requirements may vary depending on your location and the type of vehicle you are renting.',
    FAQ2_QUESTION: 'Do you offer delivery and pickup services?',
    FAQ2_ANSWER: 'Yes, we do! We offer convenient delivery and pickup services to various locations, including airports, hotels, and more. Just let us know your preferred location, and we will take care of the rest.',
    FAQ3_QUESTION: 'Is there an age requirement for renting a vehicle?',
    FAQ3_ANSWER: 'Yes, the minimum age requirement for renting a vehicle is usually 21 years old. However, some locations may have higher age requirements or additional restrictions for certain vehicle types.',
    FAQ4_QUESTION: 'What happens if I need to cancel my reservation?',
    FAQ4_ANSWER: 'We understand that plans can change, which is why we offer flexible cancellation policies. Depending on the timing of your cancellation, there may be applicable fees. Please refer to our terms and conditions or contact our customer support team for assistance.',
    FAQ5_QUESTION: 'Is insurance included in the rental price?',
    FAQ5_ANSWER: 'Basic insurance is included with all our rentals. Additional coverage options are available for enhanced protection and complete peace of mind during your trip.',

    // CTA section
    CTA_HEADING: 'Looking for a car?',
    CTA_PHONE: '+537 547-6401',
    CTA_BOOK_NOW: 'Book now',
  },
  ar: {
    // Hero
    HERO_TITLE: 'من نحن',
    BREADCRUMB_HOME: 'الرئيسية',
    BREADCRUMB_ABOUT: 'من نحن',

    // Features section
    FEATURES_HEADING: 'حيث تصبح كل رحلة استثنائية',
    FEATURE_VARIETY_TITLE: 'علامات تجارية متنوعة',
    FEATURE_VARIETY_DESC: `اختر من بين مجموعة واسعة من العلامات التجارية والموديلات في ${env.WEBSITE_NAME}. من السيارات الصغيرة الاقتصادية إلى سيارات الدفع الرباعي الفاخرة، اعثر على السيارة المثالية لكل مناسبة.`,
    FEATURE_SUPPORT_TITLE: 'دعم متميز',
    FEATURE_SUPPORT_DESC: 'فريق الدعم المخصص لدينا متاح على مدار الساعة لمساعدتك في كل خطوة. من أسئلة الحجز إلى المساعدة على الطريق، نحن دائمًا هنا من أجلك.',
    FEATURE_FREEDOM_TITLE: 'حرية قصوى',
    FEATURE_FREEDOM_DESC: 'استمتع بمرونة تامة مع سياسات إلغاء سهلة، وخيارات مسافات غير محدودة، وحرية تغيير خططك في أي وقت.',
    FEATURE_FLEXIBILITY_TITLE: 'مرونة أثناء التنقل',
    FEATURE_FLEXIBILITY_DESC: 'أدر حجزك بسهولة من خلال تطبيقنا. احجز أو عدّل أو مدّد إيجارك ببضع نقرات، أينما كنت.',

    // Video section
    VIDEO_ALT: 'استكشف أسطولنا',

    // Stats section
    STAT_CUSTOMERS_VALUE: '+20 ألف',
    STAT_CUSTOMERS_LABEL: 'عملاء سعداء',
    STAT_CARS_VALUE: '+540',
    STAT_CARS_LABEL: 'عدد السيارات',
    STAT_EXPERIENCE_VALUE: '+25',
    STAT_EXPERIENCE_LABEL: 'سنوات من الخبرة',

    // Unlock memories section
    UNLOCK_HEADING: 'اصنع ذكريات لا تُنسى على الطريق',
    UNLOCK_DESC: `في ${env.WEBSITE_NAME}، نؤمن بأن كل رحلة تروي قصة. مهمتنا هي توفير السيارة المثالية لتكتب قصتك.`,
    UNLOCK_ITEM1_TITLE: 'مركبات فاخرة',
    UNLOCK_ITEM1_DESC: 'كل سيارة في أسطولنا تتم صيانتها وفحصها بعناية لضمان راحتك وسلامتك في كل رحلة.',
    UNLOCK_ITEM2_TITLE: 'أسعار شفافة',
    UNLOCK_ITEM2_DESC: 'لا رسوم مخفية أو مفاجآت. ما تراه هو ما تدفعه، مع ضمان أسعار تنافسية.',
    UNLOCK_ITEM3_TITLE: 'استلام سهل',
    UNLOCK_ITEM3_DESC: 'عمليات استلام وتسليم مبسطة حتى تتمكن من الانطلاق على الطريق في دقائق.',
    UNLOCK_ITEM4_TITLE: 'تغطية تأمينية',
    UNLOCK_ITEM4_DESC: 'قُد براحة بال مع خيارات التأمين الشاملة المضمنة في كل إيجار.',

    // Download app section
    DOWNLOAD_LABEL: 'حمّل التطبيق من',
    DOWNLOAD_HEADING: 'حمّل تطبيقنا',
    DOWNLOAD_DESC: 'احجز سيارتك القادمة مباشرة من هاتفك. متاح على iOS و Android لتجربة سلسة.',
    APP_STORE: 'آب ستور',
    GOOGLE_PLAY: 'جوجل بلاي',

    // Testimonials section
    TESTIMONIALS_HEADING: 'آراء عملائنا',
    TESTIMONIAL1_TEXT: 'خدمة استثنائية! كانت السيارة نظيفة تمامًا وعملية الحجز كانت سلسة للغاية. أنصح بشدة لجميع احتياجات التأجير.',
    TESTIMONIAL1_NAME: 'سارة أحمد',
    TESTIMONIAL2_TEXT: 'أفضل خدمة تأجير سيارات استخدمتها على الإطلاق. أسعار لا تُضاهى وخدمة عملاء رائعة. لن أستأجر من أي مكان آخر.',
    TESTIMONIAL2_NAME: 'محمد خالد',
    TESTIMONIAL3_TEXT: 'أُعجبت جدًا بجودة المركبات واحترافية الموظفين. كانت تجربتي مثالية من البداية إلى النهاية.',
    TESTIMONIAL3_NAME: 'ليلى حسن',

    // FAQ section
    FAQ_HEADING: 'أهم أسئلة تأجير السيارات',
    FAQ1_QUESTION: 'ما المستندات المطلوبة لاستئجار مركبة؟',
    FAQ1_ANSWER: 'لاستئجار مركبة، ستحتاج عادةً إلى رخصة قيادة سارية، وبطاقة ائتمان للدفع والتأمين، وإثبات تأمين. قد تختلف المتطلبات الإضافية حسب الموقع ونوع المركبة.',
    FAQ2_QUESTION: 'هل توفرون خدمات التوصيل والاستلام؟',
    FAQ2_ANSWER: 'نعم! نوفر خدمات توصيل واستلام مريحة إلى مواقع متعددة، بما في ذلك المطارات والفنادق. فقط أخبرنا بالموقع الذي تفضله وسنتولى الباقي.',
    FAQ3_QUESTION: 'هل يوجد حد أدنى للعمر لاستئجار مركبة؟',
    FAQ3_ANSWER: 'نعم، الحد الأدنى للعمر المطلوب عادة هو 21 عامًا. قد تفرض بعض المواقع متطلبات عمر مختلفة أو قيودًا إضافية لأنواع معينة من المركبات.',
    FAQ4_QUESTION: 'ماذا يحدث إذا احتجت إلى إلغاء حجزي؟',
    FAQ4_ANSWER: 'نتفهم أن الخطط قد تتغير، لذلك نوفر سياسات إلغاء مرنة. قد تُطبق رسوم بحسب توقيت الإلغاء. يرجى مراجعة الشروط والأحكام أو التواصل مع فريق الدعم.',
    FAQ5_QUESTION: 'هل التأمين مشمول في سعر الإيجار؟',
    FAQ5_ANSWER: 'التأمين الأساسي مشمول مع جميع إيجاراتنا. تتوفر خيارات تغطية إضافية لحماية معززة وراحة بال تامة.',

    // CTA section
    CTA_HEADING: 'هل تبحث عن سيارة؟',
    CTA_PHONE: '+537 547-6401',
    CTA_BOOK_NOW: 'احجز الآن',
  },
  es: {
    // Hero
    HERO_TITLE: 'Sobre nosotros',
    BREADCRUMB_HOME: 'Inicio',
    BREADCRUMB_ABOUT: 'Sobre nosotros',

    // Features section
    FEATURES_HEADING: 'Donde cada viaje se siente extraordinario',
    FEATURE_VARIETY_TITLE: 'Marcas variadas',
    FEATURE_VARIETY_DESC: `Elige entre una amplia gama de marcas y modelos de vehiculos en ${env.WEBSITE_NAME}. Desde compactos eficientes hasta SUV de lujo, encuentra el coche perfecto para cada ocasion.`,
    FEATURE_SUPPORT_TITLE: 'Soporte excepcional',
    FEATURE_SUPPORT_DESC: 'Nuestro equipo de soporte dedicado esta disponible las 24 horas del dia, los 7 dias de la semana para ayudarte en cada paso. Desde preguntas de reserva hasta asistencia en carretera.',
    FEATURE_FREEDOM_TITLE: 'Maxima libertad',
    FEATURE_FREEDOM_DESC: 'Disfruta de total flexibilidad con politicas de cancelacion faciles, opciones de kilometraje ilimitado y la libertad de cambiar tus planes en cualquier momento.',
    FEATURE_FLEXIBILITY_TITLE: 'Flexibilidad en movimiento',
    FEATURE_FLEXIBILITY_DESC: 'Gestiona tu alquiler facilmente con nuestra aplicacion movil. Reserva, modifica o extiende tu alquiler con unos pocos toques, donde quiera que estes.',

    // Video section
    VIDEO_ALT: 'Explora nuestra flota',

    // Stats section
    STAT_CUSTOMERS_VALUE: '20k+',
    STAT_CUSTOMERS_LABEL: 'Clientes satisfechos',
    STAT_CARS_VALUE: '540+',
    STAT_CARS_LABEL: 'Numero de coches',
    STAT_EXPERIENCE_VALUE: '25+',
    STAT_EXPERIENCE_LABEL: 'Anos de experiencia',

    // Unlock memories section
    UNLOCK_HEADING: 'Crea recuerdos inolvidables en la carretera',
    UNLOCK_DESC: `En ${env.WEBSITE_NAME}, creemos que cada viaje cuenta una historia. Nuestra mision es proporcionarte el coche perfecto para escribir la tuya.`,
    UNLOCK_ITEM1_TITLE: 'Vehiculos premium',
    UNLOCK_ITEM1_DESC: 'Cada coche de nuestra flota esta cuidadosamente mantenido e inspeccionado para garantizar tu comodidad y seguridad.',
    UNLOCK_ITEM2_TITLE: 'Precios transparentes',
    UNLOCK_ITEM2_DESC: 'Sin cargos ocultos ni sorpresas. Lo que ves es lo que pagas, con tarifas competitivas garantizadas.',
    UNLOCK_ITEM3_TITLE: 'Recogida facil',
    UNLOCK_ITEM3_DESC: 'Procesos de recogida y devolucion simplificados para que puedas ponerte en marcha en minutos.',
    UNLOCK_ITEM4_TITLE: 'Cobertura de seguro',
    UNLOCK_ITEM4_DESC: 'Conduce con tranquilidad con nuestras opciones de seguro integral incluidas en cada alquiler.',

    // Download app section
    DOWNLOAD_LABEL: 'DESCARGAR APP EN',
    DOWNLOAD_HEADING: 'Descarga nuestra app',
    DOWNLOAD_DESC: 'Reserva tu proximo coche de alquiler directamente desde tu telefono. Disponible en iOS y Android.',
    APP_STORE: 'App Store',
    GOOGLE_PLAY: 'Google Play',

    // Testimonials section
    TESTIMONIALS_HEADING: 'Opiniones de nuestros clientes',
    TESTIMONIAL1_TEXT: 'Servicio excepcional! El coche estaba impecable y el proceso de reserva fue increiblemente fluido. Muy recomendable para todas tus necesidades de alquiler.',
    TESTIMONIAL1_NAME: 'Maria Garcia',
    TESTIMONIAL2_TEXT: 'El mejor servicio de alquiler de coches que he usado. Precios imbatibles y un servicio al cliente fantastico. No alquilare en ningun otro lugar.',
    TESTIMONIAL2_NAME: 'Carlos Lopez',
    TESTIMONIAL3_TEXT: 'Muy impresionada con la calidad de los vehiculos y el profesionalismo del personal. Mi experiencia fue perfecta de principio a fin.',
    TESTIMONIAL3_NAME: 'Ana Martinez',

    // FAQ section
    FAQ_HEADING: 'Preguntas frecuentes sobre alquiler de coches',
    FAQ1_QUESTION: 'Que documentos necesito para alquilar un vehiculo?',
    FAQ1_ANSWER: 'Para alquilar un vehiculo, normalmente necesitaras una licencia de conducir valida, una tarjeta de credito para el pago y el deposito de seguridad, y un comprobante de seguro. Los requisitos adicionales pueden variar.',
    FAQ2_QUESTION: 'Ofrecen servicios de entrega y recogida?',
    FAQ2_ANSWER: 'Si! Ofrecemos comodos servicios de entrega y recogida en varios lugares, incluidos aeropuertos, hoteles y mas. Solo indicanos tu ubicacion preferida.',
    FAQ3_QUESTION: 'Existe un requisito de edad para alquilar un vehiculo?',
    FAQ3_ANSWER: 'Si, la edad minima requerida suele ser de 21 anos. Sin embargo, algunas ubicaciones pueden tener requisitos de edad mas altos o restricciones adicionales.',
    FAQ4_QUESTION: 'Que sucede si necesito cancelar mi reserva?',
    FAQ4_ANSWER: 'Entendemos que los planes pueden cambiar, por eso ofrecemos politicas de cancelacion flexibles. Segun el momento de tu cancelacion, pueden aplicarse cargos.',
    FAQ5_QUESTION: 'El seguro esta incluido en el precio del alquiler?',
    FAQ5_ANSWER: 'El seguro basico esta incluido con todos nuestros alquileres. Hay opciones de cobertura adicionales disponibles para mayor proteccion y tranquilidad.',

    // CTA section
    CTA_HEADING: 'Buscas un coche?',
    CTA_PHONE: '+537 547-6401',
    CTA_BOOK_NOW: 'Reservar ahora',
  },
})

langHelper.setLanguage(strings)
export { strings }
