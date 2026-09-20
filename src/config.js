// 游戏相关的常量集中放这里，改规则只动这一个文件
const WORDS = ['苹果','房子','电脑','月亮','熊猫','飞机','香蕉','雨伞','太阳','汽车','小狗','电视','书本','铅笔','火车','足球','蛋糕','花朵','山峰','河流','眼睛','电话','眼镜','楼梯','剪刀','灯笼','火箭','企鹅','蘑菇','冰淇淋'];
const TARGET_SCORE = 100;
const BASE_SCORE = 100;
const DRAWER_COEF = 0.5;

// 各阶段的秒数
const CHOOSING_SECONDS = 15;
const DRAWING_SECONDS = 60;
const ANSWERING_SECONDS = 30;
const VOTING_SECONDS = 30;
const ROUND_END_PAUSE = 6000;

module.exports = {
	WORDS,
	TARGET_SCORE,
	BASE_SCORE,
	DRAWER_COEF,
	CHOOSING_SECONDS,
	DRAWING_SECONDS,
	ANSWERING_SECONDS,
	VOTING_SECONDS,
	ROUND_END_PAUSE,
};
