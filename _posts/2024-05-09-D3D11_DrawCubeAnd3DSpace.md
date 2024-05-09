---
layout: post
title: "Direct3D11 튜토리얼 정리4: 육면체 그리기 및 3D 공간(작성중)"
category: 컴퓨터공학
tags: [C/C++, D3D11, Direct3D11]
---

## 이전 게시글

&emsp;이전 게시글에서 내용과 코드가 이어집니다. 안 보고 오셨다면

### [Direct3D11 튜토리얼 정리1: 화면 지우기](/컴퓨터공학/2024/03/20/D3D11_ClearScreen.html)
### [Direct3D11 튜토리얼 정리2: 삼각형 그리기](/컴퓨터공학/2024/03/29/D3D11_DrawTriangle.html)
### [Direct3D11 튜토리얼 정리3: 간단한 쉐이더 활용](/컴퓨터공학/2024/04/03/D3D11_SimpleShader.html)

&emsp;먼저 보시는 것도 추천!

## 결과

![결과 이미지](/assets/images/)

## 이번 게시글에서 사용할 전체 코드

**Jekyll 버그인지 코드 부분 부분에서 넣지도 않은 \가 출력되고 있네요. 참고해주십쇼!**

### C++

~~~ C++
~~~

### HLSL

#### VertexShader.hlsl

~~~ HLSL
~~~

#### PixelShader.hlsl

~~~ HLSL
~~~

#### ShaderHeader.hlsli

~~~ HLSL
~~~

## 코드 살펴보기

### 사용할 라이브러리 및 컴파일러 옵션

이전과 동일

### 단계별 접근

&emsp;이번엔 글 형식을 조금 바꿔보겠습니다. 이전까지는 사실상 2D 공간을 다루는 거라 직관적인 부분이 많아서 사용법만 다루고 넘어가도 괜찮았지만 3차원부터는 필요 정보 하나 더 늘어난 만큼 고려해야 할 것들이 더 많아집니다.

#### 정점 데이터 변경 정의

~~~ C++
// 사용할 정점 구조체
// 위치 정보 외에도 다양한 데이터가 추가될 수 있음
typedef struct
{
	XMFLOAT3 pos; // 단순 (x, y, z)를 표현하기 위해 float3 사용
	XMFLOAT4 color; // Red, Green, Blue, Alpha를 표현하기 위한 float4
} vertex_t;
~~~

&emsp;본격적으로 물체를 정의하기 전에 일단 정점을 조금 바꿔봤습니다. 색상만 간단하게 추가해봤고 특별한 이유는 없습니다ㅋㅋ

~~~ C++
	// GPU에게 정점의 정보를 알려주기 위한 구조체 초기화
	// 구조체에 포함된 각 요소별로 이 작업을 진행해서 넘겨줘야함
	D3D11_INPUT_ELEMENT_DESC vertexLayoutDescForPos;

	vertexLayoutDescForPos.SemanticName = "POSITION"; // 해당 데이터의 용도
	vertexLayoutDescForPos.SemanticIndex = 0; // 용도가 겹칠 경우 사용할 색인 번호
	vertexLayoutDescForPos.Format = DXGI_FORMAT_R32G32B32_FLOAT; // 입력 데이터 형식
	vertexLayoutDescForPos.InputSlot = 0; // 버퍼의 슬롯 번호
	vertexLayoutDescForPos.AlignedByteOffset = 0; // 구조체에서 요소의 시작 위치(바이트 단위)
	vertexLayoutDescForPos.InputSlotClass = D3D11_INPUT_PER_VERTEX_DATA; // 입력 데이터의 분류법
	vertexLayoutDescForPos.InstanceDataStepRate = 0; // 인스턴싱에 사용할 배수

	D3D11_INPUT_ELEMENT_DESC vertexLayoutDescForColor;

	vertexLayoutDescForColor.SemanticName = "COLOR"; // 해당 데이터의 용도
	vertexLayoutDescForColor.SemanticIndex = 0; // 용도가 겹칠 경우 사용할 색인 번호
	vertexLayoutDescForColor.Format = DXGI_FORMAT_R32G32B32A32_FLOAT; // 입력 데이터 형식
	vertexLayoutDescForColor.InputSlot = 0; // 버퍼의 슬롯 번호
	vertexLayoutDescForColor.AlignedByteOffset = sizeof(vertex_t::pos); // 구조체에서 요소의 시작 위치(바이트 단위)
	vertexLayoutDescForColor.InputSlotClass = D3D11_INPUT_PER_VERTEX_DATA; // 입력 데이터의 분류법
	vertexLayoutDescForColor.InstanceDataStepRate = 0; // 인스턴싱에 사용할 배수

	// 파이프라인에 전송할 레이아웃 배열
	D3D11_INPUT_ELEMENT_DESC layoutArr[] = {
		vertexLayoutDescForPos,
		vertexLayoutDescForColor
	};
~~~

&emsp;정점 데이터 레이아웃이 변했으므로 이렇게 추가로 DESC를 만들어서 넘겨주셔야 합니다. 방법은 비슷하니까 샘플에서 잘 변형하면 되니까 자세한 설명은 생략!

#### 물체 데이터 정의

~~~ C++
	// 전송할 정점 배열
	vertex_t vertices[8] = {
		{ { 1.f, 1.f, -1.f }, { 0.f, 0.f, 0.f, 1.f} },
		{ { 1.f, -1.f, -1.f }, { 1.f, 0.f, 0.f, 1.f} },
		{ { -1.f, 1.f, -1.f }, { 0.f, 1.f, 0.f, 1.f} },
		{ { -1.f, -1.f, -1.f }, { 0.f, 0.f, 1.f, 1.f} },
		{ { 1.f, 1.f, 1.f }, { 1.f, 1.f, 0.f, 1.f} },
		{ { 1.f, -1.f, 1.f }, { 1.f, 0.f, 1.f, 1.f} },
		{ { -1.f, 1.f, 1.f }, { 0.f, 1.f, 1.f, 1.f} },
		{ { -1.f, -1.f, 1.f }, { 1.f, 1.f, 1.f, 1.f} }
	};
~~~

&emsp;육면체를 그릴 예정이니 8개의 정점을 정의해줍시다. 제가 기존에 작성해놓은 코드에서는 삼각형 정점 정의를 이렇게 바꾸는 것 빼고는 굳이 변경하실 필요 없습니다.

~~~ C++
	// 인덱스 데이터 정의
	WORD indice[36] = {
		2, 0, 1, // 정면
		2, 1, 3,

		0, 4, 5, // 우측
		5, 1, 0,

		4, 6, 7, // 뒷면
		7, 5, 4,

		3, 7, 6, // 좌측
		6, 2, 3,

		2, 6, 4, // 윗면
		4, 0, 2,

		3, 1, 5, // 아랫면
		5, 7, 3
	};
~~~

&emsp;정점 데이터가 크기가 더 커져서 인덱스 버퍼의 가치가 더 높아졌습니다. 그러니 인덱스도 잘 정의해줍시다. 여기도 마찬가지로 나머지 코드는 굳이 변경하실 필요 없습니다. <br>
&emsp;근데 잘 보시면 그냥 무난하게 인덱스를 배치한 게 아니라 왔다갔다 이상하게 배치해놨죠? 이게 3D 공간과 관계가 있습니다...만 나중에 봅시다ㅋㅋ

#### 렌더링 코드 변경

~~~ C++
const FLOAT clearColor[4] = { 0.5f, 0.5f, 0.5f, 1.f };
~~~

&emsp;배경색을 좀 바꿔봤습니다. 이전에 썼던 보라색 바탕은 눈이 좀 아플 것 같아서 회색으로 바꿔봤습니다ㅎㅎ

~~~ C++
	spDeviceContext->DrawIndexed(
		36, // 그릴 인덱스의 수
		0, // 첫 인덱스를 읽을 위치
		0 // 정점 버퍼로부터 정점을 읽기 전에 각 인덱스에 더할 값
	);
~~~

&emsp;그릴 인덱스 수만 바꾸면 끝!

#### 1차 결과 확인

![1차 결과 이미지](/assets/images/2024-05-09-D3D11_DrawCubeAnd3DSpace_images/result1.jpg)

&emsp;네 아무것도 없습니다.

## 소스코드 깃 주소

[DrawCube](https://github.com/redbindy/DX11ForPost/tree/master/DrawCube)

## 참고자료 및 출처
- [DirectX-SDK-Samples](https://github.com/walbourn/directx-sdk-samples)
- [MSDN - User-Defined Type](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-user-defined)
- [MSDN - XMMatrixLookAtLH 함수(directxmath.h)](https://learn.microsoft.com/ko-kr/windows/win32/api/directxmath/nf-directxmath-xmmatrixlookatlh)
- [MSDN - XMMatrixPerspectiveFovLH function (directxmath.h)](https://learn.microsoft.com/en-us/windows/win32/api/directxmath/nf-directxmath-xmmatrixperspectivefovlh)