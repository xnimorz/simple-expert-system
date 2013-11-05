
var loadExpSystemFromLocalStorage = function()
{
    var template = '<div class="b-page-test-switch__item b-page border-radius" index="{1}">{0}</div>';
    var target = $(".b-page-test-switch");

    for (var i in localStorage)
    {
        if (i.match("[ExpTestSystem:]"))
        {
            target.append(template.replace("{1}", i).replace("{0}", i.substr(16)));
        }
    }
}

var getFromLocalStorage = function(index)
{
    return localStorage[index];
}

var testSystem;

/**
 * Инициализация. Реакция на кнопки  и т.п.
 */
function init()
{
    loadExpSystemFromLocalStorage();
    /**
     * Выбор теста. Его загрузка с localStorage, либо парсинг с textarea
     */
    $("#start-test").bind("click keypress",function()
    {
        testSystem = new TestSystem();
        if ($(".b-page-test-switch__selected") && $(".b-page-test-switch__selected").length > 0)
        {
            testSystem.parse(getFromLocalStorage($(".b-page-test-switch__selected").attr("index")));
        }
        else
        testSystem.parse($("#test").val());

        $(".b-page-main").addClass("hide");
        $(".b-page-test").removeClass("hide");

        $("#test-descr").html("Проходит консультация");

        testSystem.start();
    });


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

    $("#complete-answer").live("click keypress",function()
    {
       testSystem.accept($("#current-answer").attr("value"));
    });

}

window.onload = init;


function TestSystem()
{
    this.testObject = {};
    this.testVariables = {};
    this.testRules = {};
    this.target = [];
    this.currentInput  = null;
}

TestSystem.prototype.start = function()
{
    for (var i in this.testVariables)
    {
        this.testObject[this.testVariables[i].name] = this.testVariables[i].value;
        if (this.testVariables[i].isTarget)
            this.target.push(this.testVariables[i].name);
    }
    for (var i in this.testRules)
    {
        var temp = "<script>"+ this.testRules[i].Func+"</";
        temp += "script>";
        $("body").append($(temp));
        this.testObject[this.testRules[i].name] = this.testRules[i];
    }
   this.nextStep();
}

TestSystem.prototype.accept = function(str)
{
    this.testObject[this.currentInput] = str;
    this.nextStep();
}

TestSystem.prototype.ask = function(str)
{
    console.log(str);
    $("#current-question").html(str);
}

TestSystem.prototype.log = function(str)
{
    console.log(str);
    var template = '<div class="b-page-questions__answers-item">{0}</div>';
    $("#answers").html($("#answers").html() + template.replace("{0}", str));
}

TestSystem.prototype.find = function(variable)
{
   this.log("Поиск переменной " + variable);
   for (var i in this.testRules)
   {
       for (var j in this.testRules[i].determVariables)
       {
           if (j == variable)
           {
               this.log("Переменная " + variable + " определяется в правиле "+ this.testRules[i].name);
               for (var k in this.testRules[i].ifVariables)
               {
                   if (this.testObject[k] == "" ||  this.testObject[k] === undefined)
                   {
                       this.log("Для запуска правила " + this.testRules[i].name + " необходимо определить переменную " + k);
                        return this.find(k);
                   }
               }
               this.log("Все переменные определены, выполнение правила: " + this.testRules[i].name);
               return this.testRules[i].name;
           }
       }
   }
    this.log("Определение в правиле переменной " + variable + " не было найдено. Введите переменную "+ variable);
    this.ask("Введите " + variable);
    return {
                tag:-1,
                name: variable
            };
}

TestSystem.prototype.nextStep = function()
{
    var isOver = true;
    var results = "";
    for  (var i in this.target)
    {

        if (this.testObject[this.target[i]] == "" || this.testObject[this.target[i]] === undefined ) isOver = false;
        results = this.target[i] + " : " + this.testObject[this.target[i]] + "\n";
    }
    if (isOver)
    {
        $("#test-descr").html("Тест закончен");
        alert("Тест закончен." +results);
        this.ask("Тест закончен." +results);
        return;
    }
    isOver = true;
    for (var i in this.testRules)
    {
        isOver = false;
    }
    if (isOver)
    {
        alert("Решение не найдено" + results);
        $("#test-descr").html("Решение не найдено");
        this.ask("Решение не найдено" + results);
        return;
    }
    for  (var i in this.target)
    {
        if (this.testObject[this.target[i]] == "" || this.testObject[this.target[i]] === undefined)
        {

            var question = this.find(this.target[i]);
            if (question.tag && question.tag == -1)
            {
                this.currentInput = question.name;
            }
            else
            {
                eval(question + ".call(this.testObject);");
                var res = "";
                for (var i in this.testRules[question].determVariables)
                {
                    res += i + " : " + this.testObject[i] + " ";
                }
                this.log("Определены переменные: " + res);
                this.log("Переход на следующий шаг");
                delete this.testRules[question];
                this.nextStep();
            }
        }
    }

}

TestSystem.prototype.parse = function(data)
{
    var index = 0;
    while (data.substr(index,8) != "[rules:]")
    {
        if (data[index] != "~") index++;
        else
        {
            index++;
            var lastIndex = index + 1;
            var isGood = true;
            while (data[lastIndex] != "}" || !isGood)
            {
                if (data[lastIndex] == '"') isGood = !isGood;
                lastIndex++;
            }
            var obj = JSON.parse(data.slice(index, lastIndex + 1));
            this.testVariables[obj.name] = obj;
        }
    }
    index+=8;
    while (data.substr(index,5) != "[end]")
    {
        if (data[index] != "~") index++;
        else
        {
            index++;
            var lastIndex = index + 1;
            var isGood = true;
            var isGood2 = true;
            var countBracket = 1;
            while (data[lastIndex] != "}" || !isGood || !isGood2 || countBracket > 1)
            {
                if (data[lastIndex] == '"') isGood = !isGood;
                if (data[lastIndex] == "'") isGood2 = !isGood2;
                if (data[lastIndex] == "{") countBracket++;
                if (data[lastIndex] == "}") countBracket--;
                lastIndex++;
            }
            var obj = JSON.parse(data.slice(index, lastIndex + 1));
            this.testRules[obj.name] = obj;
        }
    }
}