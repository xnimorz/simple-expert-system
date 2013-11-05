var variables = [];
var rules = [];
var completeTest;

var currentPage = "variable";


function generateIfFunction(rule,name)
{
    var Func = "function "+name + "(){";

    for (var i in rule.allVariables)
    {
        Func += "var " + i + "=" + "this." + i + ";";
    }

    Func += "if(" + rule.ifRule + ") {" + (rule.thenRule?rule.thenRule : "") + "}";
    if (rule.elseRule)
    {
        Func += "else{"+ rule.elseRule + "}"
    }

    for (var i in rule.determVariables)
    {
        Func += "this." + i + "=" + i + ";";
    }

    Func += "}";
    return Func;
}

function parseVariables(str)
{
    var variables = {};
    for (var i = 0; i < str.length;)
    {
        console.log(str[i]);
        if (/[a-z]/i.test(str[i]))
        {
            var variable = str[i++];
            while (i < str.length && /[a-z0-9]/i.test(str[i]))
            {
                variable += str[i++];
            }
            variables[variable] = true;
        }
        else
        if (str[i] == "'")
        {
            i++;
            while (i < str.length && str[i] != "'")
            {
                i++;
            }
        }
        else i++;
    }
    return variables;
}

function hideAll()
{
    if (!$(".p-variables").hasClass('b-page-input-hide'))
    {
        $(".p-variables").addClass('b-page-input-hide');
    }
    if (!$(".p-rules").hasClass('b-page-input-hide'))
    {
        $(".p-rules").addClass('b-page-input-hide')
    }
    if (!$(".p-result").hasClass('b-page-input-hide'))
    {
        $(".p-result").addClass('b-page-input-hide');
    }
}

function generateTest()
{
    var test = "[variables:]\n";
    for (var i in variables)
    {
        test += "~" + JSON.stringify(variables[i]) + '\n';
    }
    test += "[rules:]\n";
    for (var i in rules)
    {
        test += "~" + JSON.stringify(rules[i]) + '\n';
    }
    test += "[end]";
    return test;

}

window.onload = function()
{
    $("#variable-add").live("click keypress",function()
    {
        var template = '<div class="b-page-test-switch__item b-page border-radius b-page-test-switch__item_small" index="{0}">{1}</div>';
        var variableObj =
        {
            name : $("#variable-name").attr("value"),
            isTarget : $("#is-target").attr("checked"),
            value : $("#start-value").attr("value")
        };

        if (!/[a-z][a-z0-9]+/i.test(variableObj.name))
        {
            alert("Неверный формат имени переменной");
            return;
        }

        var possibleValues = $("#variables-values").val();
        if (possibleValues != "")
        {
            possibleValues = possibleValues.split("\n");
            variableObj.possibles = possibleValues;
        }

        $(".existing-variables").append(template.replace("{0}",variableObj.name).replace("{1}",variableObj.name));
        variables[variableObj.name] = variableObj;
    });

    $("#rule-add").live("click keypress",function()
    {
        var template = '<div class="b-page-test-switch__item b-page border-radius b-page-test-switch__item_small" index="{0}">{1}</div>';
        var ruleObj =
        {
            name: $("#name-rule").attr("value"),
            ifRule: $("#if-rule").attr("value"),
            thenRule: $("#then-rule").attr("value"),
            elseRule: $("#else-rule").attr("value")
        }

        ruleObj.ifVariables     = parseVariables(ruleObj.ifRule);
        ruleObj.thenVariables   = parseVariables(ruleObj.thenRule);
        ruleObj.elseVariables   = parseVariables(ruleObj.elseRule);
        ruleObj.determVariables = {};
        ruleObj.allVariables = {};

        console.log(ruleObj.ifVariables);

        for(var i in ruleObj.thenVariables)
        {
            ruleObj.determVariables[i] = true;
            ruleObj.allVariables[i] = true;
        }
        for (var i in ruleObj.elseVariables)
        {
            ruleObj.determVariables[i] = true;
            ruleObj.allVariables[i] = true;
        }
        for (var i in ruleObj.ifVariables)
        {
            ruleObj.allVariables[i] = true;
        }

        rules[ruleObj.name] = (ruleObj);
        ruleObj.Func = generateIfFunction(ruleObj,ruleObj.name);
        console.log(ruleObj.Func);
        $(".existing-rules").append(template.replace("{0}",ruleObj.name).replace("{1}",ruleObj.name));

    });

    $(".existing-variables .b-page-test-switch__item").live("click keypress", function()
    {
       var varName = $(this).attr("index");
       var variableObj = variables[varName];
       if (currentPage == "variable")
       {
           $("#variable-name").attr("value", variableObj.name);
           $("#is-target").attr("checked", variableObj.isTarget? "checked" : false);

           $("#start-value").attr("value", variableObj.value);
           $("#variables-values").val(variableObj.possibles? variableObj.possibles.join("\n"):"");
       }

    });

    $(".existing-rules .b-page-test-switch__item").live("click keypress", function()
    {
        var ruleName = $(this).attr("index");
        var rule = rules[ruleName];

        if (currentPage == "rule")
        {
            $("#name-rule").attr("value",rule.name);
            $("#if-rule").attr("value",rule.ifRule);
            $("#then-rule").attr("value",rule.thenRule);
            $("#else-rule").attr("value",rule.elseRule);
        }

    });



    $("#variables").live("click keypress",function()
    {
       hideAll();
       currentPage = "variable";
       $(".p-variables").removeClass('b-page-input-hide');
    });

    $("#rules").live("click keypress", function()
    {
        hideAll();
        currentPage = "rule";
        $(".p-rules").removeClass('b-page-input-hide');
    });

    $("#save").live("click keypress",function()
    {
       hideAll();
        $(".p-result").removeClass('b-page-input-hide');
        currentPage = "result";
        completeTest = generateTest();
        $("#exp-system-test").val(completeTest);
    });

    $("#test-add").live("click keypress",function()
    {
       localStorage.setItem("[ExpTestSystem:]" + $("#name-test").attr("value"),completeTest);
    });
}