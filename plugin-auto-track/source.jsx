import React from 'react';
import api from '@/api';
import utils from '@/utils';
import './index-area2.less';

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
    };
    const query = utils.query();
  }

  componentDidMount() {
    api
      .getConfig({
        names: 'init',
      })
      .fetch()
      .then((res) => {
        this.setState({ ...res.data });
      });
  }

  renderGridItem(data) {
    const { code } = data;
    const params = {};

    function handleClick() {
      location.href = 'url?params';
    }

    return (
      <a className='grid-item' key={code} onClick={handleClick}>
        <div className='grid-item-content'>
          <img src={data.windowImage} />
        </div>
        <p>{data.name}</p>
      </a>
    );
  }

  renderGrid() {
    const { data, showNum, more } = this.state;

    const icons = [];

    for (let i = 0; i < showNum; i++) {
      icons.push(data[i]);
    }

    if (showNum < data.length) {
      icons[showNum - 1] = {
        code: '999',
        status: 0,
        name: '全部',
        image: '全部的icon',
      };
    }

    return icons.map((item) => this.renderGridItem(item));
  }

  handleClick3 = () => {
    console.log('demo3');
  };

  render() {
    return (
      <div className='app'>
        {this.renderGrid()}
        <div onClick={() => console.log('demo1')}>demo1</div>
        <div
          onClick={() => {
            console.log('demo2');
          }}
        >
          demo2
        </div>
        <div onClick={this.handleClick3}>demo3</div>
      </div>
    );
  }
}
