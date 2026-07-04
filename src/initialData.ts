import { Story } from './types';

export const INITIAL_STORY: Story = {
  id: 'aetheria-1',
  title: 'Aetheria\'nın Kayıp Çarkları',
  genre: 'Bilim Kurgu / Steampunk',
  synopsis: 'Gökyüzü şehri Aetheria, bin yıldır devasa saat dişlilerinin dönmesiyle havada kalmaktadır. Ancak çarklar yavaşlamaya başlar ve genç bir makinist olan Kaelen, şehrin düşüşünü engellemek için yasaklanmış kadim teknolojilerin peşine düşer.',
  chapters: [
    {
      id: 'chapter-1',
      title: '1. Bölüm: Gökyüzünde Pas Kokusu',
      order: 1,
      content: 'Kaelen, yüzünün her yerine bulaşmış motor yağı ve pas lekelerini silmeye çalışırken, elindeki basınç anahtarıyla devasa buhar pistonunu sıkıştırıyordu. Bulutların 5000 metre üzerinde asılı duran Aetheria şehri, o gün her zamankinden daha derin ve huzursuz bir şekilde sarsıldı.\n\n"Bu sarsıntı normal değil," diye mırıldandı yanındaki pirinç kaplama robota bakarak. Gideon, mekanik gözlerini Kaelen\'e çevirdi ve klik sesleriyle yanıt verdi. Şehrin kalbi olan "Kadim Saat" yavaşlıyordu. Yüksek Konsey bunu halktan gizliyordu ancak aşağıda, makine dairelerinde çalışanlar gerçeği çok iyi biliyordu: Dişliler durursa, şehir yeryüzünün zehirli sislerle kaplı çorak topraklarına çakılacaktı.\n\nKaelen, alet çantasını sırtına geçirip gözetleme kulesine giden metal merdivenleri tırmanmaya başladı. Gökyüzü bugün alışılmadık bir şekilde mor rengine bürünmüştü ve kuzeyden gelen rüzgarlar pas kokuyordu.',
      synopsis: 'Kaelen şehrin kalbindeki sarsıntıları fark eder ve Gideon ile birlikte durumu incelemeye karar verir.',
      status: 'taslak',
      notes: 'Giriş bölümü. Bu bölümde Aetheria\'nın atmosferini ve steampunk estetiğini okuyucuya hissettirmeliyiz.'
    },
    {
      id: 'chapter-2',
      title: '2. Bölüm: Konseyin Sırrı',
      order: 2,
      content: 'Gözlemevinin devasa cam kubbesinin altında, Yüksek Konsül Amara Sterling soğuk bir ifadeyle gökyüzünü izliyordu. Pirinç teleskop, şehrin altındaki sis denizinde beliren devasa gölgeleri tarıyordu.\n\nKaelen gizlice gözetleme salonunun gölgelerine süzüldüğünde, Amara\'nın muhafız şefine verdiği fısıltılı emirleri duydu.\n\n"Kadim Çekirdek tükeniyor," diyordu Amara. "Eğer halk bunu öğrenirse isyan çıkar. Makinistlerin alt katlara girişini tamamen engelleyin. Özellikle de o meraklı Kaelen Vane\'i uzak tutun."\n\nKaelen nefesini tuttu. Şehri havada tutan sır, sadece basit mekanik çarklar değildi. Konsey, yeryüzünden çıkarılan ve parıldayan mavi bir enerji kaynağı olan "Aether Kristali"ni saklıyordu ve bu kristal can çekişiyordu.',
      synopsis: 'Kaelen, Konsey salonuna sızar ve Konsül Amara\'nın sırrını öğrenir.',
      status: 'taslak',
      notes: 'Amara ile Kaelen arasındaki ideolojik çatışmanın temelleri atılacak.'
    }
  ],
  characters: [
    {
      id: 'char-1',
      name: 'Kaelen Vane',
      role: 'basrol',
      physicalDesc: '22 yaşında, dağınık kahverengi saçlı, kaynak gözlüklerini alnından eksik etmeyen, elleri sürekli yağ lekeleriyle kaplı genç bir makinist.',
      personality: 'Meraklı, inatçı, otoriteye karşı şüpheci ve makinelerin dilinden anlayan bir dahi.',
      backstory: 'Babası da şehrin alt mekanizmalarında baş mühendisti fakat 5 yıl önce gizemli bir kaza sonucu sis denizine düştü.',
      goals: 'Şehrin düşüşünü engellemek ve babasının kayboluşunun arkasındaki gerçeği ortaya çıkarmak.',
      secrets: 'Babasından miras kalan, üzerinde garip rünler olan antik bir mekanik cep saati taşır.',
      avatarColor: 'amber'
    },
    {
      id: 'char-2',
      name: 'Konsül Amara Sterling',
      role: 'antagonist',
      physicalDesc: '40\'lı yaşlarında, kusursuz kesim gümüş işlemeli kadife elbiseler giyen, keskin bakışlı, asil duruşlu bir kadın.',
      personality: 'Soğuk, hesapçı, şehrin düzenini ve kendi gücünü korumak için her şeyi feda etmeye hazır.',
      backstory: 'Aetheria\'nın kurucu ailelerinden birine mensup. Yıllarca yeryüzündeki sırları gizlemek için çalıştı.',
      goals: 'Şehri ne pahasına olursa olsun ayakta tutmak ve yeryüzündeki kadim uygarlığın uyanmasını önlemek.',
      secrets: 'Kristalin tükendiğini ve aslında yapay yollarla yenilenemeyeceğini biliyor.',
      avatarColor: 'rose'
    },
    {
      id: 'char-3',
      name: 'Gideon',
      role: 'yardimci',
      physicalDesc: 'Pirinç ve bakırdan yapılma, rünlerle parıldayan mavi gözlere sahip, antik bir buhar robotu.',
      personality: 'Sadık, lojik, bazen hafif alaycı mekanik klik sesleri çıkaran bir yoldaş.',
      backstory: 'Kaelen tarafından hurdalıkta bulunup yeniden tamir edildi ancak işlemcisi antik çağlardan kalma.',
      goals: 'Kaelen\'i tehlikelerden korumak ve kendi hafıza bankalarındaki kayıp verileri çözmek.',
      secrets: 'Aslında Aetheria\'yı kuran antik mühendislerin prototiplerinden biri.',
      avatarColor: 'indigo'
    }
  ],
  places: [
    {
      id: 'place-1',
      name: 'Kadim Saat Kulesi (The Great Clockwork)',
      description: 'Aetheria\'nın tam merkezinde yükselen, gökyüzünü delen devasa kule. Şehrin tüm dişli sistemleri ve buhar kanalları buradan yönetilir.',
      sensoryDetails: 'Metal gıcırtıları, yoğun sıcak buhar kokusu, ritmik tik-tak sesleri ve havayı titreten bir enerji uğultusu.',
      significance: 'Şehrin hem beyni hem de kalbidir. Buraya giriş sadece yüksek konsey izniyle mümkündür.',
      color: 'emerald'
    },
    {
      id: 'place-2',
      name: 'Paslı Dişliler Sokağı (Rusty Gears Slums)',
      description: 'Şehrin en alt katmanlarında, makine dairesinin hemen üstünde yer alan, işçilerin ve makinistlerin yaşadığı karanlık, rutubetli ve kalabalık bölge.',
      sensoryDetails: 'Kömür dumanı, paslanmış borulardan damlayan sular, ucuz gaz lambalarının sarı ışığı ve sokak satıcılarının sesleri.',
      significance: 'Halkın isyan ateşinin parlamaya en müsait olduğu yer. Kaelen\'in atölyesi de buradadır.',
      color: 'orange'
    }
  ],
  timelineEvents: [
    {
      id: 'event-1',
      title: 'Büyük Sarsıntı',
      description: 'Saat Kulesi\'ndeki ana şaftlardan biri aniden kilitlenir ve tüm şehir 3 metre aşağıya doğru sarsılır. Bu, yaklaşan felaketin ilk somut kanıtıdır.',
      sequence: 1,
      color: 'red'
    },
    {
      id: 'event-2',
      title: 'Gizli Keşif',
      description: 'Kaelen cep saatinin kilitli bir bölmesini açmayı başarır. Saatin içindeki projeksiyon, yeryüzündeki harabelerde saklı olan Kayıp Çark\'ın haritasını gösterir.',
      sequence: 2,
      color: 'sky'
    },
    {
      id: 'event-3',
      title: 'Makinistlerin Yasaklanması',
      description: 'Konsül Amara, makinistlerin kuleye girmesini yasaklar ve şehir genelinde sokağa çıkma yasağı ilan eder.',
      sequence: 3,
      color: 'amber'
    }
  ],
  canvasNodes: [
    {
      id: 'node-1',
      type: 'sahne',
      x: 100,
      y: 100,
      title: '1. Bölüm Sahnesi',
      content: 'Kaelen atölyesinde Gideon\'u tamir ederken büyük sarsıntı yaşanır. Kaelen şehri kurtarmak için harekete geçer.',
      color: '#fbbf24'
    },
    {
      id: 'node-2',
      type: 'karakter',
      x: 400,
      y: 100,
      title: 'Kaelen Vane',
      content: 'Ana karakter. Mekanik dehası. Babasının kayıp cep saatini taşıyor.',
      color: '#3b82f6',
      linkedId: 'char-1'
    },
    {
      id: 'node-3',
      type: 'karakter',
      x: 700,
      y: 200,
      title: 'Konsül Amara',
      content: 'Antagonist. Şehrin sırlarını ve kristali korumak için Kaelen\'i engellemeye çalışıyor.',
      color: '#ef4444',
      linkedId: 'char-2'
    },
    {
      id: 'node-4',
      type: 'mekan',
      x: 400,
      y: 350,
      title: 'Kadim Saat Kulesi',
      content: 'Şehrin kalbi. Kaelen ve Amara burada karşı karşıya gelecek.',
      color: '#10b981',
      linkedId: 'place-1'
    },
    {
      id: 'node-5',
      type: 'not',
      x: 100,
      y: 350,
      title: 'Ana Soru',
      content: 'Kaelen, kristalin tükendiğini öğrendiğinde şehri tahliye mi edecek, yoksa yeryüzüne inip yeni kristal mi arayacak?',
      color: '#a855f7'
    }
  ],
  canvasEdges: [
    {
      id: 'edge-1',
      source: 'node-1',
      target: 'node-2',
      label: 'Ana Karakter'
    },
    {
      id: 'edge-2',
      source: 'node-2',
      target: 'node-4',
      label: 'Sızmaya Çalışıyor'
    },
    {
      id: 'edge-3',
      source: 'node-3',
      target: 'node-4',
      label: 'Koruyor'
    },
    {
      id: 'edge-4',
      source: 'node-2',
      target: 'node-3',
      label: 'Düşmanlık'
    }
  ],
  settings: {
    apiKey: '',
    isUsingSystemKey: true,
    model: 'gemini-3.5-flash',
    systemInstruction: 'Sen yaratıcı, sürükleyici ve betimlemeleri güçlü bir roman ve hikaye yazarı yardımcısısın. Kullanıcının verdiği karakterleri, mekanları ve olay örgülerini temel alarak zengin detaylar içeren, okuyucuyu içine çeken hikaye bölümleri üretmeli, var olan metinleri geliştirmeli veya karakter/mekan fikirleri bulmalısın. Türkçe dil bilgisi kurallarına ve edebi anlatım diline üst düzeyde özen göster.',
    temperature: 0.8,
    genre: 'Bilim Kurgu / Steampunk'
  }
};
