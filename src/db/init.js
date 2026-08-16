const { pool } = require('../config/db');
const authModel = require('../modules/auth/auth.model');
const userModel = require('../modules/user/user.model');
const announcementModel = require('../modules/announcement/announcement.model');
const scholarModel = require('../modules/scholar/scholar.model');
const chatModel = require('../modules/chat/chat.model');
const fatwaModel = require('../modules/fatwa/fatwa.model');
const prayerModel = require('../modules/prayer/prayer.model');
const quranModel = require('../modules/quran/quran.model');
const communityModel = require('../modules/community/community.model');
const subscriptionModel = require('../modules/subscription/subscription.model');
const notificationModel = require('../modules/notification/notification.model');
const uploadModel = require('../modules/upload/upload.model');
const paymentModel = require('../modules/payment/payment.model');
const tourPackageModel = require('../modules/tour_package/tour_package.model');
const shoppingModel = require('../modules/shopping/shopping.model');
const foodOrderModel = require('../modules/food_order/food_order.model');
const certificateModel = require('../modules/certificate/certificate.model');

async function init() {
  console.log('Initializing database tables...');
  await authModel.init();
  await userModel.init();
  await announcementModel.init();
  await scholarModel.init();
  await chatModel.init();
  await fatwaModel.init();
  await prayerModel.init();
  await quranModel.init();
  await communityModel.init();
  await subscriptionModel.init();
  await notificationModel.init();
  await uploadModel.init();
  await paymentModel.init();
  await tourPackageModel.init();
  await shoppingModel.init();
  await foodOrderModel.init();
  await certificateModel.init();
  console.log('All tables initialized.');
}

async function seed() {
  const [plans] = await pool.query('SELECT COUNT(*) as c FROM subscription_plans');
  if (plans[0].c === 0) {
    await pool.query(`INSERT INTO subscription_plans (name, label, type, price, chat_limit, duration_days) VALUES
      ('single_chat', 'Single Chat', 'single_chat', 49.00, 1, NULL),
      ('monthly', 'Monthly Plan', 'monthly', 199.00, NULL, 30),
      ('yearly', 'Yearly Plan', 'yearly', 999.00, NULL, 365)`);
    console.log('Seeded subscription plans.');
  }

  const [surahs] = await pool.query('SELECT COUNT(*) as c FROM quran_surahs');
  if (surahs[0].c === 0) {
    const data = [
      [1,'الفاتحة','Al-Fatiha','The Opening','Meccan',7],
      [2,'البقرة','Al-Baqarah','The Cow','Medinan',286],
      [3,'آل عمران','Aal-E-Imran','The Family of Imran','Medinan',200],
      [4,'النساء','An-Nisa','The Women','Medinan',176],
      [5,'المائدة','Al-Maidah','The Table Spread','Medinan',120],
      [6,'الأنعام','Al-Anam','The Cattle','Meccan',165],
      [7,'الأعراف','Al-Araf','The Heights','Meccan',206],
      [8,'الأنفال','Al-Anfal','The Spoils of War','Medinan',75],
      [9,'التوبة','At-Tawbah','The Repentance','Medinan',129],
      [10,'يونس','Yunus','Jonah','Meccan',109],
      [11,'هود','Hud','Hud','Meccan',123],
      [12,'يوسف','Yusuf','Joseph','Meccan',111],
      [13,'الرعد','Ar-Rad','The Thunder','Medinan',43],
      [14,'إبراهيم','Ibrahim','Abraham','Meccan',52],
      [15,'الحجر','Al-Hijr','The Rocky Tract','Meccan',99],
      [16,'النحل','An-Nahl','The Bee','Meccan',128],
      [17,'الإسراء','Al-Isra','The Night Journey','Meccan',111],
      [18,'الكهف','Al-Kahf','The Cave','Meccan',110],
      [19,'مريم','Maryam','Mary','Meccan',98],
      [20,'طه','Ta-Ha','Ta-Ha','Meccan',135],
      [21,'الأنبياء','Al-Anbiya','The Prophets','Meccan',112],
      [22,'الحج','Al-Hajj','The Pilgrimage','Medinan',78],
      [23,'المؤمنون','Al-Mumenoon','The Believers','Meccan',118],
      [24,'النور','An-Noor','The Light','Medinan',64],
      [25,'الفرقان','Al-Furqan','The Criterion','Meccan',77],
      [26,'الشعراء','Ash-Shuara','The Poets','Meccan',227],
      [27,'النمل','An-Naml','The Ant','Meccan',93],
      [28,'القصص','Al-Qasas','The Stories','Meccan',88],
      [29,'العنكبوت','Al-Ankaboot','The Spider','Meccan',69],
      [30,'الروم','Ar-Room','The Romans','Meccan',60],
      [31,'لقمان','Luqman','Luqman','Meccan',34],
      [32,'السجدة','As-Sajda','The Prostration','Meccan',30],
      [33,'الأحزاب','Al-Ahzab','The Combined Forces','Medinan',73],
      [34,'سبإ','Saba','Sheba','Meccan',54],
      [35,'فاطر','Fatir','The Originator','Meccan',45],
      [36,'يس','Ya-Seen','Ya-Seen','Meccan',83],
      [37,'الصافات','As-Saaffat','Those Ranged in Ranks','Meccan',182],
      [38,'ص','Sad','Sad','Meccan',88],
      [39,'الزمر','Az-Zumar','The Crowds','Meccan',75],
      [40,'غافر','Ghafir','The Forgiver','Meccan',85],
      [41,'فصلت','Fussilat','Explained in Detail','Meccan',54],
      [42,'الشورى','Ash-Shura','The Consultation','Meccan',53],
      [43,'الزخرف','Az-Zukhruf','The Gold Adornments','Meccan',89],
      [44,'الدخان','Ad-Dukhan','The Smoke','Meccan',59],
      [45,'الجاثية','Al-Jathiya','The Kneeling','Meccan',37],
      [46,'الأحقاف','Al-Ahqaf','The Wind-curved Sandhills','Meccan',35],
      [47,'محمد','Muhammad','Muhammad','Medinan',38],
      [48,'الفتح','Al-Fath','The Victory','Medinan',29],
      [49,'الحجرات','Al-Hujraat','The Inner Apartments','Medinan',18],
      [50,'ق','Qaf','Qaf','Meccan',45],
      [51,'الذاريات','Adh-Dhariyat','The Scatterers','Meccan',60],
      [52,'الطور','At-Tur','The Mount','Meccan',49],
      [53,'النجم','An-Najm','The Star','Meccan',62],
      [54,'القمر','Al-Qamar','The Moon','Meccan',55],
      [55,'الرحمن','Ar-Rahman','The Most Gracious','Medinan',78],
      [56,'الواقعة','Al-Waqia','The Event','Meccan',96],
      [57,'الحديد','Al-Hadid','The Iron','Medinan',29],
      [58,'المجادلة','Al-Mujadila','The Pleading Woman','Medinan',22],
      [59,'الحشر','Al-Hashr','The Gathering','Medinan',24],
      [60,'الممتحنة','Al-Mumtahina','The Examined One','Medinan',13],
      [61,'الصف','As-Saff','The Row','Medinan',14],
      [62,'الجمعة','Al-Jumua','Friday','Medinan',11],
      [63,'المنافقون','Al-Munafiqoon','The Hypocrites','Medinan',11],
      [64,'التغابن','At-Taghabun','Mutual Loss and Gain','Medinan',18],
      [65,'الطلاق','At-Talaq','Divorce','Medinan',12],
      [66,'التحريم','At-Tahrim','The Prohibition','Medinan',12],
      [67,'الملك','Al-Mulk','The Dominion','Meccan',30],
      [68,'القلم','Al-Qalam','The Pen','Meccan',52],
      [69,'الحاقة','Al-Haaqqa','The Inevitable','Meccan',52],
      [70,'المعارج','Al-Maarij','The Ascending Stairways','Meccan',44],
      [71,'نوح','Nooh','Noah','Meccan',28],
      [72,'الجن','Al-Jinn','The Jinn','Meccan',28],
      [73,'المزمل','Al-Muzzammil','The Enfolded One','Meccan',20],
      [74,'المدثر','Al-Muddaththir','The Cloaked One','Meccan',56],
      [75,'القيامة','Al-Qiyama','The Resurrection','Meccan',40],
      [76,'الإنسان','Al-Insan','The Man','Medinan',31],
      [77,'المرسلات','Al-Mursalat','The Emissaries','Meccan',50],
      [78,'النبإ','An-Naba','The News','Meccan',40],
      [79,'النازعات','An-Naziat','Those Who Pull Out','Meccan',46],
      [80,'عبس','Abasa','He Frowned','Meccan',42],
      [81,'التكوير','At-Takwir','The Folding Up','Meccan',29],
      [82,'الإنفطار','Al-Infitar','The Cleaving','Meccan',19],
      [83,'المطففين','Al-Mutaffifin','Those Who Deal in Fraud','Meccan',36],
      [84,'الإنشقاق','Al-Inshiqaq','The Splitting Asunder','Meccan',25],
      [85,'البروج','Al-Burooj','The Constellations','Meccan',22],
      [86,'الطارق','At-Tariq','The Nightcommer','Meccan',17],
      [87,'الأعلى','Al-Ala','The Most High','Meccan',19],
      [88,'الغاشية','Al-Ghashiya','The Overwhelming','Meccan',26],
      [89,'الفجر','Al-Fajr','The Dawn','Meccan',30],
      [90,'البلد','Al-Balad','The City','Meccan',20],
      [91,'الشمس','Ash-Shams','The Sun','Meccan',15],
      [92,'الليل','Al-Lail','The Night','Meccan',21],
      [93,'الضحى','Ad-Duha','The Morning Brightness','Meccan',11],
      [94,'الشرح','Ash-Sharh','The Expansion','Meccan',8],
      [95,'التين','At-Tin','The Fig','Meccan',8],
      [96,'العلق','Al-Alaq','The Clot','Meccan',19],
      [97,'القدر','Al-Qadr','The Power','Meccan',5],
      [98,'البينة','Al-Bayyina','The Clear Evidence','Medinan',8],
      [99,'الزلزلة','Az-Zalzala','The Earthquake','Medinan',8],
      [100,'العاديات','Al-Adiyat','The Runners','Meccan',11],
      [101,'القارعة','Al-Qaria','The Striking','Meccan',11],
      [102,'التكاثر','At-Takathur','The Competition','Meccan',8],
      [103,'العصر','Al-Asr','The Time','Meccan',3],
      [104,'الهمزة','Al-Humaza','The Slanderer','Meccan',9],
      [105,'الفيل','Al-Fil','The Elephant','Meccan',5],
      [106,'قريش','Quraish','Quraish','Meccan',4],
      [107,'الماعون','Al-Maun','The Small Kindnesses','Meccan',7],
      [108,'الكوثر','Al-Kawthar','The Abundance','Meccan',3],
      [109,'الكافرون','Al-Kafiroon','The Disbelievers','Meccan',6],
      [110,'النصر','An-Nasr','The Help','Medinan',3],
      [111,'المسد','Al-Masad','The Flame','Meccan',5],
      [112,'الإخلاص','Al-Ikhlas','The Sincerity','Meccan',4],
      [113,'الفلق','Al-Falaq','The Daybreak','Meccan',5],
      [114,'الناس','An-Nas','The Mankind','Meccan',6],
    ];
    for (const s of data) {
      await pool.query(
        'INSERT INTO quran_surahs (id, name_arabic, name_simple, name_english, revelation_type, verse_count) VALUES (?, ?, ?, ?, ?, ?)',
        s
      );
    }
    console.log('Seeded Quran surahs.');
  }
}

module.exports = { init, seed };
