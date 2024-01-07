---
layout: default
use_math: true
---

# 수와 연산

## 1. 소인수분해

### 거듭제곱
- 같은 숫자를 여러 번 곱하는 것을 간단하게 표현한 것
- 반복해서 곱해지는 수를 밑이라 하고 곱해진 횟수를 지수라 함

<div>
$$
    5 \times 5 \times 5 = (밑)5 ^ {3(지수)}
$$
</div>

### 소수와 합성수

#### 소수
- 1보다 큰 자연수 중 1과 자기 자신만 약수로 가지는 수

#### 소수 찾기 알고리듬
- 정해진 범위의 자연수가 있을 때(ex: 1 ~ 10), 소수를 찾아내는 방법

1. 1은 소수가 아니므로 제외
2. 선택하지 않은 소수 중 가장 작은 수를 찾아 그 소수의 배수를 모두 제외
3. 모두 걸러낼 때까지 2를 반복

<div>
$$
    A = \{ 1, 2, 3, 4, 5, 6, 7, 8, 9 \}
    \\
    \overset{1을~제외}{\Rightarrow}
    A = \{ 2, 3, 4, 5, 6, 7, 8, 9 \}
    \\
    \overset{선택되지~않은~소수~중~가장~작은~2의~배수~제거}{\Rightarrow}
    A = \{ 2, 3, 5, 7, 9 \}
    \\
    \overset{그~다음~가장~작은~3의~배수~제거}{\Rightarrow}
    A = \{ 2, 3, 5, 7 \} \quad 종료
$$
</div>

- 에라토스테네스의 체라 부르는 알고리듬

#### 합성수
- 1보다 큰 자연수 중 소수가 아닌 수

#### 1?
- 소수도 합성수도 아닌 수

### 소인수분해
- 자연수를 소수인 인수의 곱으로 나타내는 것
    - 소수란 앞서 본 소수를 말하는 것
    - 인수는 곱으로 연결된 각 항을 말함 
    - $ 5 \times 3 $이면 5와 3이 인수
- 소수인 인수를 소인수라 줄여서 부르고 이 소인수의 거듭제곱으로만 나타내는 작업

#### 소인수분해 알고리듬
1. 나누어 떨어지는 가장 작은 소수로 나눈다.
2. 몫이 소수라면 여태까지 사용했던 나누는 수와 마지막 몫을 모두 곱으로 표현하고 종료
3. 몫이 합성수면 1로 돌아가서 반복

<div>
$$
    60 = 
    \left\{\begin{matrix}
    30(몫) =
        \left\{\begin{matrix}
        15(몫) =
            \left\{\begin{matrix}
            5(몫)
            \\
            3(나누는~수)
            \end{matrix}\right.
        \\
        2(나누는~수)
        \end{matrix}\right.
    \\
    2(나누는~수) 
    \end{matrix}\right.
    \\
    \Rightarrow
    60 = 2^2 \times 3 \times 5
$$
</div>

#### 자연수 약수 구하기
- 소인수분해를 통해서 나온 소인수와 1을 조합하면 해당 숫자의 모든 자연수 약수를 구할 수 있음
    - 각 소인수 별로 0번 선택(곱하기 1), 1번 선택, 2번 선택, ..., 소인수 거듭제곱번만큼 선택
    - 이런 식으로 모든 경우의 수를 곱하기로 표현하면 모두 구할 수 있음

<div>
$$
    (60의~약수) = \{ 1, 2, 3, 4, 6, 10, 15, 30, 60 \}
    \\
    1 = 2^0 \times 3^0 \times 5^0 \quad 2-0번~선택,~3-0번~선택,~5-0번~선택
    \\
    2 = 2^1 \times 3^0 \times 5^0 \quad 2-1번~선택,~3-0번~선택,~5-0번~선택
    \\
    3 = 2^0 \times 3^1 \times 5^0 \quad 2-0번~선택,~3-1번~선택,~5-0번~선택
    \\
    4 = 2^2 \times 3^0 \times 5^0 \quad 2-2번~선택,~3-0번~선택,~5-0번~선택
    \\
    6 = 2^1 \times 3^1 \times 5^0 \quad 2-1번~선택,~3-1번~선택,~5-0번~선택
    \\
    10 = 2^1 \times 3^0 \times 5^1 \quad 2-1번~선택,~3-0번~선택,~5-1번~선택
    \\
    15 = 2^0 \times 3^1 \times 5^1 \quad 2-0번~선택,~3-1번~선택,~5-1번~선택
    \\
    30 = 2^1 \times 3^1 \times 5^1 \quad 2-1번~선택,~3-1번~선택,~5-1번~선택
    \\
    60 = 2^2 \times 3^1 \times 5^1 \quad 2-2번~선택,~3-1번~선택,~5-1번~선택
$$
</div>

## 최대공약수와 최소공배수

### 공약수
- 두 개 이상의 자연수에서 공통된 약수
    - 약수 집합에서 교집합

<div>
$$
    (6의~약수) = \{ 1, 2, 3, 6 \}
    \\
    (4의 약수) = \{ 1, 2, 4 \}
    \\
    \Rightarrow
    (6과~4의~공약수) = (6의~약수) \cap (4의 약수)=\{ 1, 2 \}
$$
</div>

- 이런 공약수 중 최댓값이 최대공약수

#### 서로소
- 최대공약수가 1인 두 자연수
    - 약수 집합의 교집합 원소가 오직 1만 있는 두 수
- 참고: 서로소라는 용어는 여러 곳에서 등장함

#### 최대공약수 구하기
1. 각 숫자를 소인수분해한다.
2. 공통된 소인수 중 지수가 작은 쪽을 취하여 곱한다.

<div>
$$
    24 = 2^3 \times 3
    \\
    36 = 2^2 \times 3^2
    \\
    \overset{최대공약수}{\Rightarrow}
    2^2 \times 3 = 12
$$
</div>

- 다른 관점으로 보면 소인수 집합의 교집합 후 모든 원소의 곱

<div>
$$
    24 \Rightarrow A = \{ 2, 2, 2, 3 \}
    \\
    36 \Rightarrow B = \{ 2, 2, 3, 3 \}
    \\
    \Rightarrow
    A \cap B = \{ 2, 2, 3 \} \Rightarrow 2^2 \times 3 = 12
$$
</div>

- 이해를 돕기 위해서 중복 집합을 사용했습니다.
    - 거듭제곱으로 표현하면 눈치 채시겠지만 표현만 다르고 같은 내용이긴 합니다ㅋㅋ

#### 최대공약수 활용 예
- 개수가 다른 두 집단을 최대한 많이 넣는 문제
    - ex) 연필 32개, 지우개 28개 있을 때, 가장 많이 넣으려면 몇 개의 묶음으로?
- 가로/세로 길이가 다른 직사각형에서 최대한 큰 정사각형으로 채우기
    - 타일 숫자 최소화하기
- 등등

### 공배수
- 두 개 이상의 자연수의 공통인 배수

#### 최소공배수
- 공배수 중 가장 작은 수
- 공배수는 최소공배수의 배수 관계임
<div>
$$
    (24와~36의~공배수) = \{ 72, 144, 216, ... \}
    \\
    \Rightarrow
    \{ 72, 72 \times 2, 72 \times 3, ... \}
$$
</div>

#### 최소공배수 구하기
1. 각 숫자를 소인수분해한다.
2. 각 소인수를 여기서 공통된 인수가 있다면 큰 지수를 택하여 모두 곱한다.

<div>
$$
    24 = 2^3 \times 3
    \\
    36 = 2^2 \times 3^2
    \\
    \overset{최소공배수}{\Rightarrow}
    2^3 \times 3^2 = 72
$$
</div>

- 소인수 집합의 관점으로 보면 합집합 원소의 곱으로 볼 수 있음

<div>
$$
    24 \Rightarrow A = \{ 2, 2, 2, 3 \}
    \\
    36 \Rightarrow B = \{ 2, 2, 3, 3 \}
    \\
    \Rightarrow
    A \cup B = \{ 2, 2, 2, 3, 3 \} \Rightarrow 2^3 \times 3^2 = 72
$$
</div>

#### 최소공배수 활용 예
- 두 분수를 모두 자연수로 만드는 수 중 가장 작은 수 구하기
- 주기가 다른 두 물체가 만나는 시간
- 동일한 십간, 십이지 조합(ex: 경인년)이 돌아오는 주기
- 등등

## 2. 정수와 유리수

### 양수와 음수
- 서로 반대되는 성질을 가진 수량에 대해 두 기호로 표현
  - '+'(양의 부호), '-'(음의 부호)
  - 양의 부호는 보통 생략함
- 보통 0을 기준으로 함

#### 양수
- 0보다 큰 수

#### 음수
- 0보다 작은 수

#### 0?
- 양수도 음수도 아님
- 그냥 정수

### 정수
- -1, 1, 2 같이 이산적으로 분포한 수
- 음의 정수, 0, 양의 정수로 구분

### 유리수
<div>
$$
    \frac{n}{m} \quad (m,n \in \mathbb{Z}, m \neq 0)
$$
</div>

- 위 형태로 표현 가능한 수를 유리수라 함
  - $ \mathbb{Z} $는 정수 집합을 나타내는 수학적 기호!
- 마찬가지로 양의 유리수, 음의 유리수로 구분 가능
- 참고: 유리수는 영어로 rational number
  - ratio는 수학에서 비를 의미 즉, 비와 비율 관련 용어
  - 정수의 비로 표현 가능한 수로 볼 수 있다는 것!

### 지금까지의 수의 체계 정리
<div>
$$
    유리수
    \left\{\begin{matrix}
    정수
        \left\{\begin{matrix}
        양의~정수(자연수):~1, 2, ...
        \\
        0
        \\
        음의~정수:~-1, -2, ...
        \end{matrix}\right.
    \\
    정수가~아닌~유리수:~-\frac{1}{2}, -0.1, ...
    \end{matrix}\right.
$$
</div>

### 수직선과 절댓값
- 여기서 말하는 수직선은 '수직'선이 아니고 '수'직선임
  - x, y축 평면에서 x축만 떼놨다고 생각해도 좋음

#### 수직선
<iframe src="./resource/1d_line_with_neg_pos.html" width="100%" height="100"></iframe>

- 그림에서 y는 무시해 주십쇼ㅋㅋ

#### 절댓값
- 교과서에서는 원점에서의 거리라고 표현함
- 개인적으론 그냥 아래와 같은 함수라고 암기하는 편이 편한 것 같음

<div>
$$
    |x|=
    \left\{\begin{matrix}
    x && x \ge 0
    \\
    -x && x < 0
    \end{matrix}\right.
$$
</div>

- 한 마디로 0이상으로 만들어주는 함수!

#### 수의 대소 비교
- 수직선 상에서 왼쪽으로 갈수록 작은 수
    - 오른쪽으로 갈수록 큰 수
- 아마 대부분 잘 하실거라 생각하지면 굳이 정리해보면

1. 양수는 0보다 크고 음수는 0보다 작다.
2. 양수는 음수보다 크다
3. 양수끼리는 절댓값이 큰 값이 크다.
4. 음수끼리는 절댓값이 작은 값이 크다.

### 정수와 유리수의 덧셈과 뺄셈

#### 덧셈
- 부호가 같을 때는 절댓값끼리 계산하고 부호를 유지하면 됨

<div>
$$
    3 + 2 = +|3 + 2| = 5
    \\
    (-3) + (-2) = -|3 + 2| = -5
$$
</div>

- 부호가 다를 때는 절댓값이 큰 쪽에서 작은 쪽을 빼고 절댓값이 큰 쪽의 부호를 가져옴

<div>
$$
    -3 + 2 = -|3 - 2| = -1
$$
</div>

- 유리수도 방법은 동일함

#### 교환법칙, 결합법칙
- 교환법칙은 좌우항을 바꿔도 결과가 동일하다는 것
- 결합법칙은 어느 위치의 수를 묶어서 먼저 계산 해도 결과는 같다는 것

<div>
$$
    교환:~3 + 2 = 2 + 3
    \\
    결합:~3 + 2 + 1 = (3 + 2) + 1 = 3 + (2 + 1)
$$
</div>

- 이러한 수학적 법칙들은 유용하게 써먹을 수 있는 곳도 있기에 당연해 보여도 성립하는지 아닌지 여부를 명백히 밝히는 것은 중요한 문제

#### 뺄셈
- 빼는 수의 부호를 바꾸어 덧셈으로 계산함
- 이제부터 (-)는 '부호를 바꿔라' 라는 의미로 받아들이면 편할 때가 꽤 있음
    - 원래대로 빼기로 하는 게 편한 경우도 당연히 존재함
- 뺄셈은 덧셈과 달리 교환법칙 같은 일부 법칙이 성립하지 않음
    - 그래서 덧셈으로 바꿔서 하는 것이기도 함

### 유리수의 곱셈과 나눗셈
- 오히려 덧셈보다 간단함

1. 절댓값끼리 연산한다.
2. (-)부호의 개수가 짝수면 (+)로 홀수면 (-)로 부호를 정해준다.
    - 단, 0이랑 곱하면 결과는 무조건 0이 됨
    - 그리고 0으로 나눌 수는 없고 0을 0이 아닌 수로 나누면 무조건 0

- 곱하기 또한 결합, 교환법칙이 적용됨
    - 그러나 나누기는 교환법칙 등이 적용되지 않음
    - 그렇기 때문에 나누기도 곱하기로 바꿔서 함

#### 역수
- 어떤 유리수에 대해서 그 수에 곱하면 결과가 1이 되는 수

<div>
$$
    \frac{a}{b} * \frac{b}{a} = 1 \quad (a, b \ne 0)
$$
</div>

- $ \frac{a}{b} $는 $ \frac{b}{a} $의 역수
    - 동시에 $ \frac{b}{a} $는 $ \frac{a}{b} $의 역수이기도 함

#### 나눗셈
- 빼기를 계산하는 것과 비슷하게 뒷항을 역수로 바꾸어 곱셈으로 계산함

#### 분배법칙
- 다음이 성립한다는 것

<div>
$$
    (-5) \times (5 + 3) = (-5) \times 5 + (-5) \times 3
$$
</div>

- 각 인수가 다항이어도 원리는 동일함
    - 처음에 생각하기 어렵다면 한 쪽을 한 덩어리로 취급하는 것도 좋은 방법
    - 요렇게 다른 문자로 바꾸는 걸 치환이라 부름

<div>
$$
    (a + b + c)(d + e + f) \quad (a + b + c) = A라 ~하면
    \\
    A(d + e + f) = Ad + Ae + Af
    \\
    \overset{A를~원래대로}{\Rightarrow}
    (a + b + c)d + (a + b + c)e + (a + b + c)f
    \\
    = ad + bd + cd + ae + be + ce + af + bf + cf
    \\
    = ad + ae + af + bd + be + bf + cd + ce + cf
$$
</div>

- 즉, 그냥 앞에서부터 하나씩 곱해서 더하면 됨
- 여담으로 이 과정을 거꾸로 하면 그게 인수분해

#### 덧셈, 뺄셈, 곱셈, 나눗셈 등이 모두 섞인 복합 계산
1. 거듭제곱이 있으면 거듭제곱 먼저 계산한다.
2. 괄호가 있으면 괄호 안을 계산하되 (), {}, [] 순서로 계산한다.
3. 곱셈과 나눗셈을 계산한다. 이 때 여러 개가 있으면 가능하면 왼쪽부터 계산한다.
    - 결합법칙, 교환법칙이 사용 가능하다면 편한 거부터 해도 무방
4. 덧셈과 뺄셈을 계산한다. 규칙은 3번과 동일

<div>
$$
    \{(-4)-(5-7)\} \div (-\frac{1}{3})^2
    \\
    \overset{거듭제곱~계산}{\Rightarrow}
    \{(-4)-(5-7)\} \div \frac{1}{9}
    \\
    \overset{전부~덧셈,~곱셈으로~변경}{\Rightarrow}
    \{(-4)+(-(5+(-7)))\} \times 9
    \\
    \overset{소괄호부터~계산}{\Rightarrow}
    \{(-4)+((-1) \times (-2))\} \times 9
    \\
    = \{(-4)+2\} \times 9
    \\
    = (-2) \times 9
    \\
    = -18
$$
</div>

- 1은 곱해도 절댓값이 변하지 않기 때문에 생략하고 많이 씀
- 그래서 $ (-1) \times (-2) $ 보단 $ -(-2) $ 이런 형태로 더 많이 보게 됨
    - 이런 관점에서 음수를 보면 $ -2 = (-1) \times 2 $로 생각도 가능함