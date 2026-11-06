/**
 * Teacher-provided Bible vocabulary decoy pool for Review Studio.
 *
 * The source list intentionally repeats some terms across stories. Deduplicate
 * case-insensitively, keeping the first supplied spelling. It is a suggestion
 * list, NOT a claim that any entry is unrelated to a particular Bible lesson.
 */
const TEACHER_DECOY_WORDS=`light darkness sky earth stars Adam Eve garden dust breath serpent fruit tree shame leaves
Cain Abel altar offering field Noah ark rain flood animals dove olive rainbow mountain covenant
tower Babel bricks language city Abram Sarah tent journey Canaan Lot herdsmen pasture flocks
valley visitors Abraham Sarah Isaac laughter Sodom Gomorrah angels fire salt Job boils ashes
friends suffering Isaac Rebekah well camels bracelet Jacob Esau stew lentils birthright disguise
goatskin blessing father deception ladder dream angels heaven stone Leah Rachel Laban weddings
shepherd sons daughters tribes Benjamin Dinah wrestling angel hip blessing Israel Joseph brothers
coat jealousy pit Potiphar servant household wife prison baker cupbearer dreams dungeon
interpretation Pharaoh cows grain famine abundance silver sacks Benjamin cup testing forgiveness
reunion family Egypt tears Moses basket river princess reeds bush fire sandals voice Horeb Aaron
staff Pharaoh palace command frogs gnats flies locusts darkness lamb blood doorposts meal firstborn
sea walls wind chariots shore manna quail water rock wilderness Sinai thunder lightning tablets
covenant commandments Sabbath parents idols honesty calf gold Aaron idol worship tent curtains
altar lampstand priests spies grapes giants Canaan report desert sandals serpents journey camp
Rahab rope window cord rooftop Jordan priests river stones crossing Jericho trumpets walls
marching shout Achan treasure silver cloak punishment Joshua sun moon Gibeon battle Othniel Ehud
Shamgar dagger oxgoad Gideon fleece torches pitchers trumpets Samson lion hair pillars Delilah
Ruth Naomi Boaz barley gleaning Hannah Samuel Eli temple prayer Samuel voice night lamp Eli
Philistines ark Dagon statue plague Saul Samuel oil crown donkey Amalek sheep cattle sacrifice
disobedience David Jesse horn shepherd oil harp music Saul palace spirit Goliath sling stone
giant armor Saul spear jealousy harp David Jonathan arrows field bow covenant cave robe sword
mercy king David throne dynasty covenant promise Bathsheba roof letter Uriah prophet Solomon
baby mothers sword wisdom temple cedar stones gold altar Rehoboam Jeroboam taxes tribes division
Elijah widow flour oil jar Baal prophets altar fire water chariot whirlwind Elijah Elisha mantle
Elisha widow oil axehead bread Naaman leprosy Jordan servant healing Elisha horses chariots army
mountain Jonah ship storm fish Nineveh Josiah scroll temple priest law Assyria Babylon siege exile
Jerusalem Daniel Nebuchadnezzar statue gold dream Shadrach Meshach Abednego furnace flames
Nebuchadnezzar tree stump dew madness Daniel lions den king stone temple foundation altar builders
rubble Esther Mordecai Haman scepter banquet Nehemiah wall gates stones builders Zechariah
Elizabeth Gabriel John incense Mary Joseph Gabriel angel Nazareth Jesus manger Bethlehem shepherds
swaddling magi star gold frankincense myrrh boy temple teachers parents Passover John wilderness
locusts honey baptism Jordan dove wilderness Satan stones Peter Andrew James John Matthew Nicodemus
night teacher Spirit rebirth jars water wine boat storm mat paralytic roof friends healing demons
man tombs pigs chains Jairus daughter crowds garment child loaves fish baskets crowd hillside
waves boat Peter wind water Pharisees law tradition robes synagogue mud eyes beggar pool sight
Mary Martha kitchen meal worry Lazarus tomb stone sisters graveclothes riches camel Zacchaeus tree
taxcollector love God neighbor heart commandments Samaritan traveler donkey inn servant coin sheep
shepherd son father prayer Father bread forgiveness kingdom seeds soil mustard yeast pearl children
disciples blessing hands infants donkey palms cloaks temple tables bread cup wine disciples supper
Judas silver kiss garden soldiers Peter rooster courtyard fire servant cross nails crown soldiers
tomb stone angels women resurrection garden Thomas wounds hands side faith Emmaus road travelers
bread scriptures mountain disciples nations clouds heaven Pentecost wind fire tongues apostles
Peter John beggar gate ankles Stephen stones Philip chariot Ethiopian Saul Damascus light blindness
Ananias Peter chains angel prison guards Barnabas Paul Cyprus ship synagogue Paul Silas jail
earthquake jailer Rome ship storm island snake Jesus trumpet clouds angels heaven`;

const unique=new Map<string,string>();
for(const word of TEACHER_DECOY_WORDS.split(/\s+/u)){
 const key=word.toLocaleLowerCase('en');
 if(!unique.has(key))unique.set(key,word);
}
export const REVIEW_DECOY_POOL:readonly string[]=Object.freeze([...unique.values()]);
