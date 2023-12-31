---
layout: default
use_math: true
---

# 초등수학 개요
[2009개정 초등수학 교육과정](http://trsketch.dothome.co.kr/page_MlkP66) <br>
&emsp;아마 프로그래머, 데이터사이언티스트쪽 분야를 하고자 마음 먹은 분들이라면 위 링크에 있는 내용들 정도는 직관적으로 이해하고 사용하실 수 있을 거라고 생각합니다(엄밀하게는 모른다고 하더라도요). 따라서, 비례 관련된 내용 하나만 다루고 나머지는 생략하겠습니다! <br>
&emsp;혹시나 초등수학에서 나오는 정의들이 기억 안 나서 뒷 내용을 따라가는데 지장이 있을까봐 걱정하실 수도 있을 것 같습니다. 그렇지만, 전혀 걱정 하실 필요 없습니다. 제가 학업적으로 뛰어난 편은 아니었고 논답시고 내용 숙지를 거의 못했음에도 불구하고 생각보다 따라 가는데는 문제가 없었던 것 같습니다. 오히려 중요한 건 이해될 때까지 자신만의 방식으로 내용을 재구성하는 일이었던 것 같습니다....너무 주제 넘었네요. 서론은 이제 끝냅시다!ㅋㅋ

# 비와 비율
&emsp;성취도 평가하시는 분들이 좋아하는 사고방식의 핵심이 들어 있는 부분이라 판단돼 선정하게 됐습니다. 하지만 그게 아니더라도, 이렇게 다시 정리하며 다시 알게 되는 부분들도 있어서, 여유가 있다면 다른 내용도 전반적으로 쭉 훑어보셔도 좋을 것 같네요:)

## 두 양의 비교
- 빼기 방법과 나누기 방법이 있음
  - 아마 직관적으로 이해 가능하실듯 합니다.

~~~C#
    if (a - b < 0) // 빼기 방법
    {
        Console.WriteLine("a가 작아요!");
    }

    if (a / b(double) < 1) // 나누기 방법
    {
        Console.WriteLine("a가 작아요...");
    }
~~~

## 비
- 나눗셈 비교를 ':' 기호를 사용하여 나타낸 것
  - 여기서 기억할 점은 뒷 값이 기준량임!

<div>
$$ 
    (비교하는~양) : (기준량)
$$
</div>

- 즉, $A:B \neq B:A~(A \neq B일~때)$

## 비율
- 기준량에 대한 비교하는 양의 크기로 아래와 같이 표현

<div>
$$ 
    (기준량에~대한~비율)
    = (비교하는~양) \div (기준량)
    = \frac{비교하는~양}{기준량}
$$
</div>

- 분모를 1로 생각했을 때, 기준 1당 비교하는 양이 몇 인지로 생각 가능

<div>
$$
    \frac{35(kcal)}{10(g)} = \frac{\frac{7}{2}(kcal)}{1(g)}
$$
</div>

- 그램당 $\frac{7}{2}(=3.5)$kcal로 해석할 수 있는 것!

### 비율의 활용
<div>
$$
    (속력) = \frac{(이동한~거리)}{(시간)}
$$
</div>

- 시간당 이동한 거리

<div>
$$
    (소금물의~농도) = \frac{(소금의~양)}{(소금물의~양)}
$$
</div>

- 소금물 1에 얼마의 소금이 들었는가
- 등등

### 백분율
- 비율에서 기준량이 100인 특수한 경우
- 100을 곱하고 %를 붙여서 표현(몇몇 퍼센트) 많이 함

<div>
$$
    \frac{85}{100} = 85\%
$$
</div>

- 이외에도 과거에 바닷물 농도를 표현할 때 썼던 퍼밀(천분율) 등 기준량에 따른 여러 단위가 존재함

# 비례식과 비례배분

## 비례식
- 두 비를 '='로 연결하여 식으로 표현한 것

<div>
$$
    a(전항, 외항) : b(후항, 내항) = c(전항, 내항) : d(후항, 외항)
$$
</div>

- 위 식은 결과적으로 $\frac{a}{b} = \frac{c}{d} \Rightarrow ad = bc$
    - 내항의 곱과 외항의 곱은 같다는 유명한 공식!
- 여러가지 성질이 있는데 분수와 등식에 작동하는 성질들을 비로 표현만 바꾼 것이 전부
    - $ a : b = ac : bc $ 등등
- 비는 보통 정수로 나타내려고 함

## 비례배분
- 어떤 값을 비에 맞게 나눠서 표현하는 것
<div>
$$
    A를~a:b로~비례배분
    \Rightarrow
    A \times \frac{a}{a + b},~A \times \frac{b}{a + b}
$$
</div>

- 예를 들어 20을 2:3으로 나눈다고 하면 8, 12로 직관적으로 나눌 수 있지만 이를 위 내용에 따라 표현하면

<div>
$$
    20을 ~2:3으로~비례배분
    \Rightarrow
    20 \times \frac{2}{2 + 3} = 8,~20 \times \frac{3}{2 + 3} = 12
$$
</div>