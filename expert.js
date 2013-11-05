var testSystem;

/**
 * Проверка доступности localStorage
 * @returns {boolean} true - браузер поддерживает LocalStorage
 */
function checkLocalStorage()
{
    try {
        return 'localStorage' in window && window['localStorage'] !== null && localStorage != undefined;
    } catch (e) {
        return false;
    }
}

/**
 *  Загрузка тестов (пунктов меню) существующих в localStorage тестов
 */
function loadItemsFromLocalStorage()
{
    if (!checkLocalStorage())
    {
        return;
    }
    var template = '<div class="b-page-test-switch__item b-page border-radius" index="{1}">{0}</div>';
    var target = $(".b-page-test-switch");

    for (var i = 0; localStorage["ExpertSys" + i]; i++)
    {
        target.html(target.html() + template.replace("{1}","ExpertSys" + i).replace("{0}",JSON.parse(localStorage["ExpertSys" + i]).title));

    }
}

/**
 * Загрузка теста с localStorage
 * @param localStorageIndex - индекс теста
 * @returns {Test} тест (база знаний) для экспертной системы
 */
function loadFromLocalStorage(localStorageIndex)
{
    return new Test(JSON.parse(localStorage[localStorageIndex]));
}

/**
 * Сохранение теста (базы знаний) в localStorage (при условии поддержки оного браузером)
 * @param test - сохраняемый тест (база знаний)
 */
function saveToLocalStorage(test)
{
    if (!checkLocalStorage())
    {
        return;
    }
    for (var i = 0; localStorage[i]; i++)
    {
        if (localStorage["ExpertSys"+i].match(test.title))
        {
            localStorage.setItem("ExpertSys" + i,test.stringify());
            return;
        }
    }
    localStorage.setItem("ExpertSys" + i,test.stringify());
}

/**
 * Реакция нажатия кнопки "далее". реакция на ввод данных и переход к следующему вопросу
 */
function step()
{
    var ans = parseFloat($("#current-answer").attr("value"));
    if (ans < 0 || ans > 100) {
        alert("Неверный ввод!");
        return;
    }
    testSystem.processAnswer(ans);
    testSystem.nextStep();
}

/**
 * Инициализация. Реакция на кнопки  и т.п.
 */
function init()
{
    loadItemsFromLocalStorage();
    /**
     * Выбор теста. Его загрузка с localStorage, либо парсинг с textarea
     */
    $("#start-test").bind("click keypress",function()
    {

        if ($(".b-page-test-switch__selected") && $(".b-page-test-switch__selected").length > 0)
        {
            testSystem = loadFromLocalStorage($(".b-page-test-switch__selected").attr("index"));
        }
        else
        {
            testSystem = new Test();
            if (!testSystem.parseData($("#test").val()))
            {
                alert("Что-то пошло не так. Проверьте вводимые данные.")
                return;
            }
            saveToLocalStorage(testSystem);
        }

        $("#test").addClass("hide");
        $(".b-page-test").removeClass("hide");
        $(".b-page-main").add("#start-test,#data-format").addClass("hide");
        $("#test-title").html(testSystem.title);

        testSystem.nextStep();
    });

    /**
     * Enter == кнопки далее при вводе вероятности
     */
    $("#current-answer").bind('keydown ',function(e)
    {
        if (e.keyCode == 13) step();
    });
    $("#complete-answer").bind("click keypress", step);

    /**
     * визуализация выбора теста
     */
    $(".b-page-test-switch__item").live("click keypress", function()
    {
        if ($(this).hasClass("b-page-test-switch__selected"))
        {
            $(this).removeClass("b-page-test-switch__selected");
            return;
        }
        $(".b-page-test-switch__selected").removeClass("b-page-test-switch__selected");
        $(this).addClass("b-page-test-switch__selected");
    });

    $("#data-format").bind("click keypress",function()
    {
        $("#test").val(
            "Формат вводимых данных:\n" +
                "На первой строке располагается название базы знаний\n" +
                "Затем через знак перевода строки - список вопросов\n" +
                "После вопросов - следует список событий (вариантов) в формате:\n"+
                "Событие<Перевод строки>Начальная_вероятность_события номер_вопроса) вероятность_max вероятность_min<перевод строки>\n" +
                "Пример ввода:\n" +
                "Определение пола\n" +
                "\n" +
                "Вы мальчик?\n"+
                "Вы девочка?\n"+
                "\n"   +
                "Мальчик\n" +
                "0.5 1) 1 0 2) 0 1\n" +
                "Девочка\n"+
                "0.5 2) 1 0 1) 0 1\n" +
                "Заметьте, номера вопросов можно устанавливать не по порядку + вопросы не влияющие на вероятность события можно опускать");


    })  ;
}

window.onload = init;

/**
 *  Сортировка вероятностей. Сравнение двух items
 * @returns {number} сравнение
 */
function sortItems(a,b)
{
    if (a.points > b.points || (a.points == b.points && a.title > b.title)) return 1;
    if (a.points == b.points && a.title == b.title) return 0;
    return -1;
}


/**
 * сравнение двух объектов - вопросов
 */
function sortQuestion(a,b)
{

    var aPoints = 0, bPoints = 0;
    for (var i = 0; i < a.items.length; i++)
    {

        aPoints += a.items[i].questionPoints[a.index].min + a.items[i].questionPoints[a.index].max + a.items[i].points;
    }
    for (var i = 0; i < b.items.length; i++)
    {
        bPoints += b.items[i].questionPoints[b.index].min + b.items[i].questionPoints[b.index].max + b.items[i].points;
    }

    if (aPoints > bPoints) return -1;
    if (aPoints == bPoints)
    {
        if (a.items.length > b.items.length) return -1;
        if (a.items.length == b.items.length) return 0;
    }
    return 1;
}

/**
 * База знаний или тест.
 * @param testObject - конструктор с уже введенных названий, вариантов и вопросов
 * @constructor
 */
function Test(testObject)
{

    this.title = "";
    this.items = [];
    this.questions = [];
    this.currentQuestion = -1;
    this.complete = false;
    if (testObject)
    {
        this.title = testObject.title;
        this.items = testObject.items;
        this.questions = testObject.questions;
    }
}

/**
 * сериализация в строку, формата JSON
 * @returns {String} JSON
 */
Test.prototype.stringify = function()
{
    return JSON.stringify({
        title       : this.title,
        items       : this.items,
        questions   : this.questions
    });
}

/**
 * Вывод "вероятностей" ответов по заданному шаблону
 */
Test.prototype.printData = function()
{
    this.items.sort(sortItems);
    var template = '<div title="{0}: {1}" class="b-page-test-items__item border-radius"><span class="b-page-test-items__item-title">{0}</span><span class="b-page-test-items__item-percent">{1}</span></div>';
    var t = $(".b-page-test-items");
    t.html("");
    for (var i = this.items.length-1; i >= 0; i--)
    {
        var res = this.items[i].points > 1? 1 : this.items[i].points;
        t.html(t.html() + template.replace("{0}",this.items[i].title).replace("{0}",this.items[i].title).replace("{1}",res).replace("{1}",res));
        if (res == 1)
        {
            this.complete = true;
        }
    }
}

/**
 * Переход к следующему вопросу
 */
Test.prototype.nextStep = function()
{

    this.printData();
    this.questions.sort(sortQuestion);
    if (this.questions.length == 0 || this.complete)
    {
        $("#current-question").html("Ознакомьтесь с решением системы. Вопросы закончены.");
        $("#complete-answer").add("#current-answer").addClass("hide");
        return;
    }
    $("#current-question").html(this.questions[0].q);
    $("#current-answer").attr("value",'');
};

/**
 * обработка ответа. Измненение вероятности события по ответу
 * @param ans  - ответ (вероятность, от 0 до 100)
 */
Test.prototype.processAnswer = function(ans)
{
    for (var i = 0 ; i < this.items.length; i++)
    {
        var point = this.items[i].questionPoints[this.questions[0].index];
        if (point)
        {
            var up = ((2*point.max - 1)*ans/100 + 1 - point.max) * this.items[i].points;
            var down = ((2*point.max - 1)*ans/100 + 1 - point.max) * this.items[i].points + ((2*point.min - 1)*ans/100 + 1 - point.min)*(1 - this.items[i].points);
            this.items[i].points = down != 0? up/down : this.items[i].points;
        }
    }
    var template = '<div class="b-page-questions__answers-item">{0}</div>'
    $("#answers").html($("#answers").html() + template.replace("{0}", this.questions[0].q))
    this.questions.shift();
}

/**
 * Получение вопросов, событий и вероятностей с строки
 * @param data - строка, содержащая данные
 * @returns {boolean} успех обработки строки
 */
Test.prototype.parseData = function(data)
{
    try
    {
        //Пропуск лишних, пустых строк
        var passEmptyStrings = function() {
            while (position < items.length && items[position] == "" ) { position++; }
        }

        var items = data.split("\n");
        var position = 0;
        passEmptyStrings();
        this.title = items[position++];
        passEmptyStrings();
        //Ввод вопросов
        while (items.length > position && items[position] != "")
        {
            this.questions.push({
                q    :items[position++],
                items: [],
                index:this.questions.length
            });
        }
        if (items.length <= position) throw "Invalid data format";

        passEmptyStrings();

        var index = 0;
        //Ввод событий
        while (items.length > position && items[position] != "")
        {
            var  pointItems = items[position + 1].split(" ");
            var newItem = {
                title          : items[position],
                points         : parseFloat(pointItems[0]),
                index          : index,
                questionPoints : []
            };
            //Вероятности событий при 100 и 0% вероятностях ответа на вопрос
            for (var i = 1; i < pointItems.length; i+= 3)
            {
                while (pointItems[i] == "") i++;
                var questionIndex = parseFloat(pointItems[i]) - 1;
                var questionPoint = {
                    max : parseFloat(pointItems[i+1]),
                    min : parseFloat(pointItems[i+2])
                };
                newItem.questionPoints[questionIndex] = questionPoint;

                this.questions[questionIndex].items.push(newItem);


            }

            this.items.push(newItem);
            index++;
            position += 2;
        }
        return true;
    }
    catch(e)
    {
        console.log(e);
        return false;
    }
}